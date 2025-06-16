import * as React from 'react';

export const WelcomeEmail = ({
  userEmail,
}) => (
  <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
    <h1 style={{ color: '#333' }}>AI Keşif Platformu'na Hoş Geldiniz!</h1>
    <p>
      Merhaba {userEmail},
    </p>
    <p>
      Yapay zeka araçları dünyasını keşfetmek için aramıza katıldığınız için çok mutluyuz. Artık en yeni ve en popüler AI araçlarını keşfedebilir, onlara puan verebilir ve topluluğumuzla kendi favorilerinizi paylaşabilirsiniz.
    </p>
    <p>
      Başlamak için aşağıdaki butona tıklayarak en son eklenen araçlara göz atabilirsiniz.
    </p>
    <a 
        href={`${process.env.NEXT_PUBLIC_SITE_URL}`} 
        style={{ 
            display: 'inline-block',
            padding: '12px 24px', 
            margin: '20px 0',
            backgroundColor: '#10B981', /* Yeşil */
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '8px',
            fontWeight: 'bold'
        }}
    >
        Platformu Keşfet
    </a>
    <hr style={{ borderColor: '#eee' }} />
    <p style={{ fontSize: '12px', color: '#777' }}>
      Eğer bu kaydı siz oluşturmadıysanız, bu e-postayı görmezden gelebilirsiniz.
    </p>
  </div>
);
