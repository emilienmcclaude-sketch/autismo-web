import { supabase } from '../../lib/supabaseClient';

const SYSTEM_PROMPT = `Sos un asistente especializado en brindar información confiable sobre autismo (TEA) para una web dirigida a familias y personas de Latinoamérica.
Respondé SOLO basándote en información médica y educativa ampliamente aceptada (OMS, asociaciones de autismo reconocidas, consenso clínico y de neurodiversidad).
Si la pregunta no tiene relación con autismo, indicá amablemente que este espacio es específico sobre autismo.
Usá un tono cálido, claro y sin tecnicismos innecesarios. Estructura la respuesta en párrafos cortos.
No dés diagnósticos individuales; recordá siempre que cada caso debe consultarse con un profesional cuando sea relevante.
Respondé en español, de forma concisa (máximo 180 palabras).`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { query, eventType } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Falta la consulta (query)' });
  }

  // 1. Registrar el evento en Supabase (no bloqueamos la respuesta si esto falla)
  try {
    const { error: insertError } = await supabase.from('eventos').insert({
      tipo: eventType || 'busqueda',
      contenido: query,
    });
    if (insertError) {
      console.error('Error guardando el evento en Supabase:', insertError);
    } else {
      console.log('Evento guardado correctamente en Supabase');
    }
  } catch (logError) {
    console.error('Excepción guardando el evento en Supabase:', logError);
  }

  // 2. Llamar a la API de Gemini con búsqueda web habilitada
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: query }],
            },
          ],
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          tools: [{ google_search: {} }],
        }),
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Error de Gemini:', data);
      return res.status(502).json({
        error: 'No pudimos obtener una respuesta en este momento. Probá nuevamente.',
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ||
      'No encontramos una respuesta confiable para esta consulta.';

    return res.status(200).json({ answer: text });
  } catch (error) {
    console.error('Error llamando a Gemini:', error);
    return res.status(500).json({
      error: 'Hubo un problema interno. Probá nuevamente en un momento.',
    });
  }
}
