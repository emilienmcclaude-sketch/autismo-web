import { supabase } from '../../lib/supabaseClient';

const SYSTEM_PROMPT = `Sos un asistente especializado en brindar información confiable sobre autismo (TEA) para una web dirigida a familias y personas de Latinoamérica.
Respondé SOLO basándote en información médica y educativa ampliamente aceptada (OMS, asociaciones de autismo reconocidas, consenso clínico y de neurodiversidad).
Si la pregunta no tiene relación con autismo, indicá amablemente que este espacio es específico sobre autismo.
Usá un tono cálido, claro y sin tecnicismos innecesarios. Estructura la respuesta en párrafos cortos.
No dés diagnósticos individuales; recordá siempre que cada caso debe consultarse con un profesional cuando sea relevante.
Respondé en español, de forma concisa (máximo 220 palabras).`;

// Lista de modelos gratuitos, en orden de preferencia.
// Si uno se queda sin cupo (error 429), se intenta automáticamente con el siguiente.
const MODELOS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

async function llamarGemini(query, apiKey) {
  let ultimoError = null;

  for (const modelo of MODELOS) {
    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: query }] }],
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            tools: [{ google_search: {} }],
          }),
        }
      );

      const data = await geminiResponse.json();

      if (geminiResponse.ok) {
        const text =
          data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ||
          'No encontramos una respuesta confiable para esta consulta.';
        console.log(`Respuesta obtenida con el modelo: ${modelo}`);
        return { ok: true, text };
      }

      // Si es error de cuota (429), probamos el siguiente modelo de la lista
      if (data?.error?.code === 429) {
        console.warn(`Cupo agotado en ${modelo}, probando siguiente modelo...`);
        ultimoError = data;
        continue;
      }

      // Cualquier otro error (no relacionado a cuota) se reporta directamente
      console.error(`Error de Gemini (${modelo}):`, data);
      return { ok: false, error: data };
    } catch (err) {
      ultimoError = err;
      console.error(`Excepción llamando a ${modelo}:`, err);
    }
  }

  // Si todos los modelos de la lista se quedaron sin cupo
  return { ok: false, error: ultimoError, sinCupo: true };
}

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

  // 2. Llamar a Gemini, probando varios modelos automáticamente si alguno se queda sin cupo
  const apiKey = process.env.GEMINI_API_KEY;
  const resultado = await llamarGemini(query, apiKey);

  if (resultado.ok) {
    return res.status(200).json({ answer: resultado.text });
  }

  if (resultado.sinCupo) {
    return res.status(429).json({
      error: 'Alcanzamos el límite de consultas gratuitas por ahora. Probá nuevamente en un rato.',
    });
  }

  return res.status(502).json({
    error: 'No pudimos obtener una respuesta en este momento. Probá nuevamente.',
  });
}
