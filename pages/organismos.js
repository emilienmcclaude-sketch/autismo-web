import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Organismos() {
  const [ciudad, setCiudad] = useState('');
  const [pais, setPais] = useState('');
  const [estado, setEstado] = useState(''); // '', 'buscando', 'error'
  const [resultado, setResultado] = useState('');

  async function buscar() {
    if (!ciudad.trim() || !pais.trim()) {
      setEstado('error');
      return;
    }
    setEstado('buscando');
    setResultado('');
    try {
      const res = await fetch('/api/organismos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciudad: ciudad.trim(), pais: pais.trim() }),
      });
      const data = await res.json();
      setResultado(data.answer || data.error || 'No pudimos encontrar resultados.');
      setEstado('');
    } catch (e) {
      setEstado('error');
      setResultado('Hubo un problema de conexión. Probá nuevamente.');
    }
  }

  return (
    <>
      <Head>
        <title>Organismos cerca de tu ciudad · Entendamos el Autismo</title>
      </Head>

      <div className="wrap">
        <div className="org-page">
          <Link href="/" className="back-link">
            ← Volver al inicio
          </Link>

          <h1>Buscá organismos en tu ciudad</h1>
          <p className="org-sub">
            Decinos tu ciudad y país, y buscamos organizaciones de autismo cercanas para que puedas contactarlas.
          </p>

          <div className="form-grid">
            <div className="form-field">
              <label>Ciudad *</label>
              <input
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
                placeholder="Ej: Córdoba"
              />
            </div>
            <div className="form-field">
              <label>País *</label>
              <input
                type="text"
                value={pais}
                onChange={(e) => setPais(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
                placeholder="Ej: Argentina"
              />
            </div>
          </div>

          {estado === 'error' && <p className="modal-error">Completá ciudad y país.</p>}

          <button className="modal-send org-search-btn" onClick={buscar} disabled={estado === 'buscando'}>
            {estado === 'buscando' ? 'Buscando...' : 'Buscar organismos'}
          </button>

          {estado === 'buscando' && (
            <div className="loading" style={{ marginTop: 20 }}>
              <div className="spinner" />
              Buscando organizaciones cercanas...
            </div>
          )}

          {resultado && !estado && (
            <div className="organismos-resultado">
              {resultado.split('\n').filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .org-page {
          max-width: 640px;
          padding: 48px 0 80px;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 24px;
          font-size: 14px;
          color: #4f6f52;
          text-decoration: none;
          font-weight: 600;
        }
        .back-link:hover {
          text-decoration: underline;
        }
        .org-page h1 {
          font-size: 32px;
          color: #374a39;
          margin: 0 0 10px;
        }
        .org-sub {
          font-size: 16px;
          color: #5b6358;
          margin: 0 0 28px;
          line-height: 1.5;
        }
        .org-search-btn {
          width: 100%;
          margin-top: 6px;
        }
      `}</style>
    </>
  );
}
