"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="tr">
      <body
        style={{
          alignItems: "center",
          background: "#020817",
          color: "#f8fafc",
          display: "flex",
          fontFamily: "system-ui, sans-serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100vh",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: "560px" }}>
          <h1>Beklenmeyen bir sorun oluştu</h1>
          <p style={{ color: "#94a3b8", lineHeight: 1.6 }}>
            Sayfa şu anda görüntülenemiyor. Birkaç saniye sonra yeniden
            deneyebilirsiniz.
          </p>
          {error?.digest && (
            <p style={{ color: "#64748b", fontSize: "12px" }}>
              Hata kodu: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "#f8fafc",
              border: 0,
              borderRadius: "8px",
              color: "#020817",
              cursor: "pointer",
              fontWeight: 600,
              marginTop: "16px",
              padding: "12px 18px",
            }}
          >
            Yeniden Dene
          </button>
        </main>
      </body>
    </html>
  );
}
