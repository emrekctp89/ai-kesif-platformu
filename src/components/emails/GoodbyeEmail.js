import * as React from 'react';

export const GoodbyeEmail = ({
  userEmail,
}) => (
  <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
    <h1 style={{ color: '#333' }}>Gidişinize Üzüldük...</h1>
    <p>
      Merhaba {userEmail},
    </p>
    <p>
      Hesabınızı sildiğinizi onaylamak için bu e-postayı gönderiyoruz. Platformumuza yaptığınız tüm katkılar için teşekkür ederiz.
    </p>
    <p>
      Fikrinizi değiştirirseniz veya gelecekte geri dönmek isterseniz, kapımız size her zaman açık.
    </p>
    <a 
        href={`${process.env.NEXT_PUBLIC_SITE_URL}`} 
        style={{ 
            display: 'inline-block',
            padding: '12px 24px', 
            margin: '20px 0',
            backgroundColor: '#6b7280', /* Gri */
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '8px',
            fontWeight: 'bold'
        }}
    >
        AI Keşif Platformu
    </a>
    <hr style={{ borderColor: '#eee' }} />
    <p style={{ fontSize: '12px', color: '#777' }}>
      Eğer bu işlemi siz yapmadıysanız, lütfen bizimle iletişime geçin.
    </p>
  </div>
);
