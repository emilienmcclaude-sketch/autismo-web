import { useState } from 'react';
import Head from 'next/head';

const ETIQUETAS = {
  busqueda: { label: 'Búsqueda', color: '#E8765B' },
  clic_tema: { label: 'Clic en tema', color: '#4F6F52' },
  clic_sugerencia: { label: 'Sugerencia rápida', color: '#A98B5D' },
  sugerencia: { label: 'Mensaje de sugerencia', color: '#5B6358' },
};

export default function Admin() {
  const [password, setPassword] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const [generando, setGenerando] = useState(false);
  const [progreso, setProgreso] = useState(null); // { actual, total, temaActual }
  const [logGeneracion, setLogGeneracion] = useState([]);

  async function generarContenido(soloIndices) {
    setGenerando(true);
    if (!soloIndices) setLogGeneracion([]);
    let total = 10;
    const indices = soloIndices || Array.from({ length: total }, (_, i) => i);

    for (const i of indices) {
      setProgreso({ actual: indices.indexOf(i) + 1, total: indices.length });
      try {
        const res = await fetch('/api/generar-contenido', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password, temaIndex: i }),
        });
        const data = await res.json();
        if (data.total) total = data.total;

        setLogGeneracion((prev) => {
          const limpio = prev.filter((l) => l.tema !== (data.tema || `Tema ${i + 1}`));
          return [...limpio, { tema: data.tema || `Tema ${i + 1}`, ok: !!data.ok, error: data.error, indice: i }];
        });
      } catch (e) {
        setLogGeneracion((prev) => [...prev, { tema: `Tema ${i + 1}`, ok: false, error: String(e), indice: i }]);
      }
      await new Promise((r) => setTimeout(r, 4000));
    }

    setGenerando(false);
    setProgreso(null);
  }

  const fallidos = logGeneracion.filter((l) => !l.ok);

  async function ingresar() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/eventos?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo ingresar.');
        setLoading(false);
        return;
      }
      setEventos(data.eventos || []);
      setAutenticado(true);
    } catch (e) {
      setError('Hubo un problema de conexión.');
    } finally {
      setLoading(false);
    }
  }

  async function actualizar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/eventos?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (res.ok) setEventos(data.eventos || []);
    } finally {
      setLoading(false);
    }
  }

  function formatearFecha(iso) {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const eventosFiltrados =
    filtro === 'todos' ? eventos : eventos.filter((e) => e.tipo === filtro);

  const conteos = eventos.reduce((acc, e) => {
    acc[e.tipo] = (acc[e.tipo] || 0) + 1;
    return acc;
  }, {});

  if (!autenticado) {
    return (
      <>
        <Head>
          <title>Admin · Entendamos el Autismo</title>
        </Head>
        <div className="admin-login-wrap">
          <div className="admin-login-box">
            <h2>Acceso privado</h2>
            <p>Ingresá la contraseña de administrador para ver el registro de actividad.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ingresar()}
              placeholder="Contraseña"
            />
            {error && <p className="admin-error">{error}</p>}
            <button onClick={ingresar} disabled={loading || !password}>
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </div>
        </div>
        <style jsx>{`
          .admin-login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FBF6EE;font-family:sans-serif;padding:20px;}
          .admin-login-box{background:#FFFDF9;border:1px solid #D9CFB8;border-radius:14px;padding:32px;max-width:360px;width:100%;}
          .admin-login-box h2{margin:0 0 8px;color:#374A39;font-size:22px;}
          .admin-login-box p{font-size:14px;color:#5B6358;margin:0 0 18px;line-height:1.4;}
          .admin-login-box input{width:100%;padding:12px 14px;border:1px solid #D9CFB8;border-radius:9px;font-size:15px;margin-bottom:12px;box-sizing:border-box;}
          .admin-login-box button{width:100%;background:#374A39;color:white;border:none;border-radius:9px;padding:12px;font-size:15px;font-weight:600;cursor:pointer;}
          .admin-login-box button:disabled{opacity:.5;}
          .admin-error{color:#E8765B;font-size:13.5px;margin:-6px 0 12px;}
        `}</style>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Admin · Entendamos el Autismo</title>
      </Head>
      <div className="admin-wrap">
        <div className="contenido-section">
          <div className="contenido-header">
            <div>
              <h2>Contenido curado</h2>
              <p>Generá los textos base de los 10 temas usando IA (se guardan en la tabla "contenido").</p>
            </div>
            <button className="generar-btn" onClick={() => generarContenido()} disabled={generando}>
              {generando ? `Generando ${progreso?.actual || 0}/${progreso?.total || 10}...` : 'Generar contenido curado (los 10)'}
            </button>
          </div>
          {fallidos.length > 0 && !generando && (
            <button
              className="reintentar-btn"
              onClick={() => generarContenido(fallidos.map((f) => f.indice))}
            >
              ↻ Reintentar solo los {fallidos.length} que fallaron
            </button>
          )}
          {logGeneracion.length > 0 && (
            <div className="log-generacion">
              {logGeneracion.map((l, i) => (
                <div key={i} className={`log-item ${l.ok ? 'ok' : 'fail'}`}>
                  {l.ok ? '✓' : '✗'} {l.tema}
                  {l.error && <span className="log-error"> — {l.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-header">
          <div>
            <h1>Registro de actividad</h1>
            <p>{eventos.length} eventos en total</p>
          </div>
          <button className="refresh-btn" onClick={actualizar} disabled={loading}>
            {loading ? 'Actualizando...' : '↻ Actualizar'}
          </button>
        </div>

        <div className="admin-stats">
          {Object.entries(ETIQUETAS).map(([key, info]) => (
            <div key={key} className="stat-card" style={{ borderColor: info.color }}>
              <span className="stat-num">{conteos[key] || 0}</span>
              <span className="stat-label">{info.label}</span>
            </div>
          ))}
        </div>

        <div className="filtros">
          <button
            className={filtro === 'todos' ? 'active' : ''}
            onClick={() => setFiltro('todos')}
          >
            Todos
          </button>
          {Object.entries(ETIQUETAS).map(([key, info]) => (
            <button
              key={key}
              className={filtro === key ? 'active' : ''}
              onClick={() => setFiltro(key)}
            >
              {info.label}
            </button>
          ))}
        </div>

        <div className="tabla">
          <div className="fila fila-header">
            <span>Tipo</span>
            <span>Contenido</span>
            <span>Fecha</span>
          </div>
          {eventosFiltrados.length === 0 && (
            <div className="vacio">No hay eventos para mostrar.</div>
          )}
          {eventosFiltrados.map((e) => {
            const info = ETIQUETAS[e.tipo] || { label: e.tipo, color: '#999' };
            return (
              <div key={e.id} className="fila">
                <span>
                  <span className="badge" style={{ background: info.color }}>
                    {info.label}
                  </span>
                </span>
                <span className="contenido">{e.contenido}</span>
                <span className="fecha">{formatearFecha(e.creado_en)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .admin-wrap{max-width:1000px;margin:0 auto;padding:32px 20px 60px;font-family:sans-serif;color:#26302A;}

        .contenido-section{border:1.5px solid #4F6F52;border-radius:12px;padding:18px 20px;margin-bottom:28px;background:#FFFDF9;}
        .contenido-header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;}
        .contenido-header h2{margin:0 0 4px;font-size:18px;color:#374A39;}
        .contenido-header p{margin:0;font-size:13.5px;color:#7A8276;}
        .generar-btn{background:#4F6F52;color:white;border:none;border-radius:9px;padding:11px 18px;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;}
        .generar-btn:disabled{opacity:.6;cursor:default;}
        .reintentar-btn{background:none;border:1px solid #E8765B;color:#E8765B;border-radius:9px;padding:8px 14px;font-size:13px;cursor:pointer;margin-top:10px;}
        .log-generacion{margin-top:14px;border-top:1px solid #EDE3D0;padding-top:12px;display:flex;flex-direction:column;gap:5px;}
        .log-item{font-size:13px;}
        .log-item.ok{color:#4F6F52;}
        .log-item.fail{color:#E8765B;}
        .log-error{color:#9CA398;}
        .admin-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
        .admin-header h1{margin:0 0 4px;font-size:26px;color:#374A39;}
        .admin-header p{margin:0;color:#7A8276;font-size:14px;}
        .refresh-btn{background:#374A39;color:white;border:none;border-radius:9px;padding:10px 18px;font-size:14px;cursor:pointer;}
        .refresh-btn:disabled{opacity:.6;}

        .admin-stats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;}
        .stat-card{border:1.5px solid;border-radius:12px;padding:14px 18px;display:flex;flex-direction:column;gap:4px;min-width:130px;background:white;}
        .stat-num{font-size:24px;font-weight:700;}
        .stat-label{font-size:12.5px;color:#7A8276;}

        .filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;}
        .filtros button{border:1px solid #D9CFB8;background:white;color:#5B6358;padding:7px 14px;border-radius:100px;font-size:13px;cursor:pointer;}
        .filtros button.active{background:#374A39;color:white;border-color:#374A39;}

        .tabla{border:1px solid #D9CFB8;border-radius:12px;overflow:hidden;background:white;}
        .fila{display:grid;grid-template-columns:160px 1fr 140px;gap:12px;padding:12px 16px;border-bottom:1px solid #EDE3D0;align-items:center;font-size:14px;}
        .fila:last-child{border-bottom:none;}
        .fila-header{background:#EDE3D0;font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.03em;color:#374A39;}
        .badge{color:white;font-size:11.5px;padding:4px 9px;border-radius:100px;white-space:nowrap;}
        .contenido{word-break:break-word;}
        .fecha{color:#7A8276;font-size:13px;}
        .vacio{padding:30px;text-align:center;color:#9CA398;font-size:14px;}

        @media (max-width: 640px){
          .fila{grid-template-columns:1fr;gap:4px;}
          .fila-header{display:none;}
          .fecha{order:3;}
        }
      `}</style>
    </>
  );
}
