import * as React from 'react';

export const ContactFormEmail = ({
  name,
  senderEmail,
  message,
}) => (
  <div style={{ fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#f9f9f9' }}>
    <div style={{ maxWidth: '600px', margin: 'auto', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
        <h1 style={{ color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
            Yeni İletişim Mesajı
        </h1>
        <p><strong>Gönderen:</strong> {name}</p>
        <p><strong>E-posta:</strong> <a href={`mailto:${senderEmail}`}>{senderEmail}</a></p>
        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />
        <h2 style={{ color: '#555' }}>Mesaj:</h2>
        <p style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f4f4f4', padding: '15px', borderRadius: '4px' }}>
            {message}
        </p>
    </div>
  </div>
);