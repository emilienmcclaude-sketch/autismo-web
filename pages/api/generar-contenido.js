import { supabase } from '../../lib/supabaseClient';

const TEMAS = [
  '¿Qué es el autismo? (definición, espectro, mitos y enfoques: clínico y de neurodiversidad)',
  'Detección y diagnóstico (señales tempranas por edad, proceso diagnóstico, autismo en niñas, diagnóstico tardío)',
  'Autismo en la niñez, 0 a 12 años (comunicación, juego, sensorialidad, rutinas, terapias, inclusión escolar)',
  'Autismo en la adolescencia, 13 a 18 años (identidad, vínculos, salud mental, educación secundaria, transición a la adultez)',
  'Autismo en la adultez (vida independiente, trabajo, relaciones, diagnóstico tardío, camuflaje social)',
  'Familia y entorno cercano (cómo acompañar, hermanos, comunicación, autocuidado de cuidadores)',
  'Educación e inclusión (derechos educativos, adaptaciones curriculares, bullying)',
  'Salud y bienestar (comorbilidades frecuentes, sensorialidad, sueño, alimentación)',
  'Derechos y legislación en Latinoamérica (marco legal general, certificados de discapacidad, derechos laborales)',
  'Comunidad y recursos (testimonios, organizaciones, glosario de términos)',
];

const PROMPT_BASE = (tema) => `Redactá un texto informativo y curado sobre autismo (TEA), específicamente sobre este tema: "${tema}".

Instrucciones:
- Está dirigido a familias y personas de Latinoamérica que buscan información confiable.
- Basate en fuentes médicas y educativas reconocidas (OMS, asociaciones de autismo, consenso clínico y de neurodiversidad).
- Tono equilibrado: combiná la mirada clínica con la del paradigma de la neurodiversidad, sin tomar partido excluyente.
- Usá un lenguaje claro, cálido, sin tecnicismos innecesarios.
- Extensión: entre 300 y 500 palabras, en párrafos cortos.
- No inventes estadísticas o datos que no puedas fundamentar; si no estás seguro de un dato puntual, hablá en términos generales.
- Respondé en español, solo con el texto final (sin títulos tipo "Aquí está el texto", sin comillas envolventes).`;

const MODELOS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];

async function generarTextoConGemini(tema, apiKey) {
  let ultimoError = null;

  for (const modelo of MODELOS) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: PROMPT_BASE(tema) }] }],
          tools: [{ google_search: {} }],
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '';
    }

    if (data?.error?.code === 429 || data?.error?.code === 503) {
      console.warn(`${modelo} no disponible (${data?.error?.code}) para "${tema}", probando siguiente modelo...`);
      ultimoError = data;
      continue;
    }

    throw new Error(JSON.stringify(data));
  }

  throw new Error(JSON.stringify(ultimoError) || 'Todos los modelos sin cupo');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { password, temaIndex } = req.body;
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  if (typeof temaIndex !== 'number' || temaIndex < 0 || temaIndex >= TEMAS.length) {
    return res.status(400).json({ error: 'Índice de tema inválido', total: TEMAS.length });
  }

  const tema = TEMAS[temaIndex];
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const texto = await generarTextoConGemini(tema, apiKey);

    // Borramos cualquier versión anterior de este mismo tema, para evitar duplicados al reintentar
    await supabase.from('contenido').delete().eq('tema', tema);

    const { error } = await supabase.from('contenido').insert({
      tema,
      titulo: tema.split('(')[0].trim(),
      texto,
    });

    if (error) {
      return res.status(500).json({ ok: false, tema, error: error.message });
    }

    return res.status(200).json({ ok: true, tema, total: TEMAS.length });
  } catch (err) {
    console.error(`Error generando contenido para "${tema}":`, err);
    return res.status(500).json({ ok: false, tema, error: String(err) });
  }
}
