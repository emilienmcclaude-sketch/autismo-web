import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { mensaje } = req.body;

  if (!mensaje || typeof mensaje !== 'string' || !mensaje.trim()) {
    return res.status(400).json({ error: 'Falta el mensaje de la sugerencia' });
  }

  try {
    const { error } = await supabase.from('eventos').insert({
      tipo: 'sugerencia',
      contenido: mensaje.trim(),
    });

    if (error) {
      console.error('Error guardando sugerencia:', error);
      return res.status(500).json({ error: 'No se pudo guardar la sugerencia.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Excepción guardando sugerencia:', err);
    return res.status(500).json({ error: 'Hubo un problema interno.' });
  }
}
