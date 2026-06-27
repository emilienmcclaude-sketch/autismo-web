import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { nombre, apellido, organismo, email, telefono, texto } = req.body;

  if (!nombre || !apellido || !email || !texto) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  if (texto.length > 150) {
    return res.status(400).json({ error: 'El mensaje supera los 150 caracteres.' });
  }

  // 1. Registrar el contacto en Supabase (queda guardado también, además de enviarse por mail)
  try {
    await supabase.from('eventos').insert({
      tipo: 'contacto',
      contenido: `${nombre} ${apellido} (${email})${organismo ? ' - ' + organismo : ''}: ${texto}`,
    });
  } catch (e) {
    console.error('Error guardando contacto en Supabase:', e);
  }

  // 2. Enviar el email con Resend
  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Entendamos el Autismo <onboarding@resend.dev>',
        to: ['entendamoselautismo@gmail.com'],
        reply_to: email,
        subject: `Nuevo contacto de ${nombre} ${apellido}`,
        html: `
          <h3>Nuevo mensaje desde el formulario de contacto</h3>
          <p><strong>Nombre:</strong> ${nombre} ${apellido}</p>
          <p><strong>Organismo:</strong> ${organismo || '(no especificado)'}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Teléfono:</strong> ${telefono || '(no especificado)'}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${texto}</p>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const errData = await resendResponse.json();
      console.error('Error enviando email con Resend:', errData);
      // El contacto ya quedó guardado en Supabase, así que igual avisamos éxito al usuario,
      // pero registramos el error para revisarlo nosotros.
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Excepción enviando email:', err);
    // El registro en Supabase ya se guardó, así que no perdemos el contacto.
    return res.status(200).json({ ok: true, emailFallo: true });
  }
}
