import { supabase } from '../../lib/supabaseClient';

const MODELOS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];

function promptOrganismos(ciudad, pais) {
  return `Buscá organizaciones, asociaciones o fundaciones de autismo (TEA) reales y activas, lo más cercanas posible a la ciudad de "${ciudad}", país "${pais}". Si no encontrás en esa ciudad puntual, ampliá a la provincia/región o al país.

Devolveme al menos 3 organismos si existen (si hay menos disponibles, mostrá los que encuentres y aclaralo).

Para cada uno, indicá:
- Nombre del organismo
- Breve descripción (1 línea)
- Link de su sitio web o red social oficial (si lo encontrás)

Formato: una organización por párrafo, en español, sin tablas ni markdown, texto simple. Si no encontrás ningún organismo confiable, decilo claramente en vez de inventar uno.`;
}

async function llamarGemini(prompt, apiKey) {
  for (const modelo of MODELOS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
          }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '';
      }
      if (data?.error?.code === 429 || data?.error?.code === 503) {
        continue;
      }
      throw new Error(JSON.stringify(data));
    } catch (err) {
      console.error(`Error con modelo ${modelo}:`, err);
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { ciudad, pais } = req.body;

  if (!ciudad || !pais) {
    return res.status(400).json({ error: 'Faltan ciudad y/o país.' });
  }

  try {
    await supabase.from('eventos').insert({
      tipo: 'busqueda_organismos',
      contenido: `${ciudad}, ${pais}`,
    });
  } catch (e) {
    console.error('Error guardando evento de búsqueda de organismos:', e);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const resultado = await llamarGemini(promptOrganismos(ciudad, pais), apiKey);

  if (!resultado) {
    return res.status(502).json({ error: 'No pudimos completar la búsqueda. Probá nuevamente.' });
  }

  return res.status(200).json({ answer: resultado });
}
