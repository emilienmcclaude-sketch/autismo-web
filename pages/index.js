import { useState, useRef } from 'react';
import Head from 'next/head';

const temas = [
  { id: 1, n: '01', t: '¿Qué es el autismo?', d: 'Definición, espectro, mitos y enfoques' },
  { id: 2, n: '02', t: 'Detección y diagnóstico', d: 'Señales por edad y proceso diagnóstico' },
  { id: 3, n: '03', t: 'Autismo en la niñez', d: '0 a 12 años: comunicación, sensorialidad, terapias' },
  { id: 4, n: '04', t: 'Autismo en la adolescencia', d: '13 a 18 años: identidad, vínculos, salud mental' },
  { id: 5, n: '05', t: 'Autismo en la adultez', d: 'Vida independiente, trabajo, relaciones' },
  { id: 6, n: '06', t: 'Familia y entorno cercano', d: 'Cómo acompañar, hermanos, autocuidado' },
  { id: 7, n: '07', t: 'Educación e inclusión', d: 'Derechos educativos y adaptaciones' },
  { id: 8, n: '08', t: 'Salud y bienestar', d: 'Comorbilidades, sueño, alimentación' },
  { id: 9, n: '09', t: 'Derechos y legislación', d: 'Marco legal por país en Latinoamérica' },
  { id: 10, n: '10', t: 'Comunidad y recursos', d: 'Testimonios, glosario, organizaciones' },
];

const sugerencias = [
  'Señales tempranas en bebés',
  'Autismo en la adolescencia',
  'Diagnóstico en adultos',
  'Cómo hablarle a otros niños sobre el autismo',
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const [showSugerencia, setShowSugerencia] = useState(false);
  const [sugerenciaTexto, setSugerenciaTexto] = useState('');
  const [sugerenciaEstado, setSugerenciaEstado] = useState(''); // '', 'enviando', 'enviado', 'error'
  const answerRef = useRef(null);

  const [showContacto, setShowContacto] = useState(false);
  const [contactoEstado, setContactoEstado] = useState(''); // '', 'enviando', 'error'
  const [showGracias, setShowGracias] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    organismo: '',
    email: '',
    telefono: '',
    texto: '',
  });

  function actualizarForm(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function enviarContacto() {
    if (!form.nombre.trim() || !form.apellido.trim() || !form.email.trim() || !form.texto.trim()) {
      setContactoEstado('error');
      return;
    }

    setContactoEstado('enviando');
    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowContacto(false);
        setContactoEstado('');
        setForm({ nombre: '', apellido: '', organismo: '', email: '', telefono: '', texto: '' });
        setShowGracias(true);
      } else {
        setContactoEstado('error');
      }
    } catch (e) {
      setContactoEstado('error');
    }
  }

  async function enviarSugerencia() {
    const texto = sugerenciaTexto.trim();
    if (!texto) return;

    setSugerenciaEstado('enviando');
    try {
      const res = await fetch('/api/sugerencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: texto }),
      });
      if (res.ok) {
        setSugerenciaEstado('enviado');
        setSugerenciaTexto('');
        setTimeout(() => {
          setShowSugerencia(false);
          setSugerenciaEstado('');
        }, 1800);
      } else {
        setSugerenciaEstado('error');
      }
    } catch (e) {
      setSugerenciaEstado('error');
    }
  }

  async function buscar(texto, eventType = 'busqueda', contenidoId = null) {
    const q = (texto ?? query).trim();
    if (!q) return;

    setQuery(q);
    setShowPanel(true);
    setLoading(true);
    setAnswer('');

    // Pequeño delay para que el panel ya esté visible en el DOM antes de hacer scroll
    setTimeout(() => {
      answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    try {
      const res = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, eventType, contenidoId }),
      });
      const data = await res.json();
      setAnswer(data.answer || data.error || 'No pudimos obtener una respuesta.');
    } catch (e) {
      setAnswer('Hubo un problema de conexión. Probá nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Entendamos el Autismo</title>
        <meta name="description" content="Información confiable sobre autismo en niños, adolescentes y adultos." />
      </Head>

      <div className="wrap">
        <header>
          <div className="header-row">
            <div>
              <div className="eyebrow">Información sobre autismo · Latinoamérica</div>
              <h1>Entendamos<br />el Autismo</h1>
              <p>Un espacio para encontrar respuestas claras sobre autismo en niños, adolescentes y adultos — buscá tu duda o explorá por tema.</p>
              <p className="header-note">Los textos que vas a ver son buscados y generados por inteligencia artificial a partir de fuentes confiables (organismos de salud y asociaciones de autismo reconocidas).</p>
            </div>
            <div className="header-buttons">
              <button className="suggestion-btn" onClick={() => setShowSugerencia(true)}>
                Dejanos tu sugerencia
              </button>
              <button className="suggestion-btn contact-btn" onClick={() => setShowContacto(true)}>
                Contactanos
              </button>
            </div>
          </div>
        </header>
      </div>

      <div className="wrap">
        <div className="search-section">
          <div className="search-box">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              placeholder="Escribí tu duda, por ejemplo: ¿cómo ayudo a mi hijo con los cambios de rutina?"
            />
            <button className="search-btn" disabled={loading} onClick={() => buscar()}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          <div className="suggestions">
            {sugerencias.map((s) => (
              <div key={s} className="chip" onClick={() => buscar(s, 'clic_sugerencia')}>
                {s}
              </div>
            ))}
          </div>

          <div ref={answerRef} className={`answer-panel ${showPanel ? 'show' : ''}`}>
            <div className="answer-header">
              <div className="dot" />
              <span>RESPUESTA · BASADA EN FUENTES CONFIABLES</span>
            </div>
            <div className="answer-body">
              {loading ? (
                <div className="loading">
                  <div className="spinner" />
                  Buscando información confiable...
                </div>
              ) : (
                answer.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)
              )}
            </div>
            <div className="disclaimer">
              Esta respuesta es generada con IA a partir de fuentes públicas de salud y organizaciones de autismo. No reemplaza una consulta con un profesional.
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="index-section">
          <h2>Explorar por tema</h2>
          <p>Toda la información organizada por etapa de vida y temática.</p>
          <div className="grid">
            {temas.map((tema) => (
              <div key={tema.n} className="card" onClick={() => buscar(tema.t, 'clic_tema', tema.id)}>
                <span className="num">{tema.n}</span>
                <h3>{tema.t}</h3>
                <p>{tema.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showSugerencia && (
        <div className="modal-overlay" onClick={() => setShowSugerencia(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Dejanos tu sugerencia</h3>
            <p className="modal-sub">¿Hay algo que te gustaría ver en esta web, o algo para mejorar? Contanos.</p>
            <textarea
              rows={4}
              value={sugerenciaTexto}
              onChange={(e) => setSugerenciaTexto(e.target.value)}
              placeholder="Escribí tu sugerencia acá..."
              disabled={sugerenciaEstado === 'enviando' || sugerenciaEstado === 'enviado'}
            />
            {sugerenciaEstado === 'error' && (
              <p className="modal-error">No se pudo enviar. Probá de nuevo.</p>
            )}
            {sugerenciaEstado === 'enviado' ? (
              <p className="modal-success">¡Gracias! Tu sugerencia fue enviada.</p>
            ) : (
              <div className="modal-actions">
                <button className="modal-cancel" onClick={() => setShowSugerencia(false)}>
                  Cancelar
                </button>
                <button
                  className="modal-send"
                  onClick={enviarSugerencia}
                  disabled={sugerenciaEstado === 'enviando' || !sugerenciaTexto.trim()}
                >
                  {sugerenciaEstado === 'enviando' ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showContacto && (
        <div className="modal-overlay" onClick={() => setShowContacto(false)}>
          <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
            <h3>Contactanos</h3>
            <p className="modal-sub">Completá tus datos y te vamos a responder a la brevedad.</p>

            <div className="form-grid">
              <div className="form-field">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => actualizarForm('nombre', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Apellido *</label>
                <input
                  type="text"
                  value={form.apellido}
                  onChange={(e) => actualizarForm('apellido', e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label>Organismo (si formás parte de uno)</label>
              <input
                type="text"
                value={form.organismo}
                onChange={(e) => actualizarForm('organismo', e.target.value)}
              />
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => actualizarForm('email', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => actualizarForm('telefono', e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label>Mensaje * ({form.texto.length}/150)</label>
              <textarea
                rows={3}
                maxLength={150}
                value={form.texto}
                onChange={(e) => actualizarForm('texto', e.target.value)}
                placeholder="Escribí tu mensaje acá..."
              />
            </div>

            {contactoEstado === 'error' && (
              <p className="modal-error">Revisá que completaste los campos obligatorios (*).</p>
            )}

            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowContacto(false)}>
                Cancelar
              </button>
              <button
                className="modal-send"
                onClick={enviarContacto}
                disabled={contactoEstado === 'enviando'}
              >
                {contactoEstado === 'enviando' ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGracias && (
        <div className="modal-overlay" onClick={() => setShowGracias(false)}>
          <div className="modal-box modal-thanks" onClick={(e) => e.stopPropagation()}>
            <h3>¡Gracias por tu comentario!</h3>
            <p className="modal-sub">Recibimos tu mensaje y te vamos a responder a la brevedad.</p>
            <button className="modal-send" onClick={() => setShowGracias(false)}>
              Volver a la página principal
            </button>
          </div>
        </div>
      )}

      <footer>Entendamos el Autismo</footer>
    </>
  );
}
