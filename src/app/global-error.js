'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="tr">
      <body
        style={{
          alignItems: 'center',
          background: '#020817',
          color: '#f8fafc',
          display: 'flex',
          fontFamily: 'system-ui, sans-serif',
          justifyContent: 'center',
          margin: 0,
          minHeight: '100vh',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <main role="alert" aria-live="assertive" style={{ maxWidth: '560px' }}>
          <p
            style={{
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              marginBottom: '12px',
              textTransform: 'uppercase',
            }}
          >
            AI Keşif
          </p>
          <h1 style={{ fontSize: '1.75rem', lineHeight: 1.2, margin: 0 }}>
            Beklenmeyen bir sorun oluştu
          </h1>
          <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>
            Sayfa şu anda görüntülenemiyor. Birkaç saniye sonra yeniden deneyebilirsiniz.
          </p>
          {error?.digest ? (
            <p style={{ color: '#64748b', fontSize: '12px' }}>Hata kodu: {error.digest}</p>
          ) : null}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center',
              marginTop: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: '#f8fafc',
                border: 0,
                borderRadius: '8px',
                color: '#020817',
                cursor: 'pointer',
                fontWeight: 600,
                minHeight: '44px',
                padding: '12px 18px',
              }}
            >
              Yeniden Dene
            </button>
            <a
              href="/"
              style={{
                alignItems: 'center',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                display: 'inline-flex',
                fontWeight: 600,
                minHeight: '44px',
                padding: '12px 18px',
                textDecoration: 'none',
              }}
            >
              Ana Sayfa
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
