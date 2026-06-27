import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { password } = req.query;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  try {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error obteniendo eventos:', error);
      return res.status(500).json({ error: 'No se pudieron obtener los eventos.' });
    }

    return res.status(200).json({ eventos: data });
  } catch (err) {
    console.error('Excepción obteniendo eventos:', err);
    return res.status(500).json({ error: 'Hubo un problema interno.' });
  }
}
