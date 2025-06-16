import * as React from 'react';

export const NewToolSuggestionEmail = ({
  toolName,
  toolLink,
  toolDescription,
  suggesterEmail,
  isLoggedInUser, // Yeni prop'u burada alıyoruz
}) => (
  <div>
    <h1>Yeni Bir AI Aracı Önerildi!</h1>
    <p>
      Merhaba Admin, AI Keşif Platformu'na yeni bir araç önerisi geldi.
    </p>
    <hr />
    <h2>Detaylar:</h2>
    <ul>
      <li><strong>Araç Adı:</strong> {toolName}</li>
      <li><strong>Web Sitesi:</strong> <a href={toolLink}>{toolLink}</a></li>
      <li><strong>Açıklama:</strong> {toolDescription}</li>
      {/* DEĞİŞİKLİK: Kullanıcı durumuna göre farklı metin gösteriyoruz */}
      <li>
        <strong>Öneren E-posta:</strong> {suggesterEmail} {isLoggedInUser ? '(Giriş yapmış kullanıcı)' : '(Misafir kullanıcı)'}
      </li>
    </ul>
    <hr />
    <p>
      Bu öneriyi incelemek ve onaylamak için lütfen admin panelini ziyaret edin.
    </p>
    <a 
        href={`${process.env.NEXT_PUBLIC_SITE_URL}/admin`} 
        style={{ padding: '12px 24px', backgroundColor: '#22c55e', color: 'white', textDecoration: 'none', borderRadius: '8px' }}
    >
        Admin Paneline Git
    </a>
  </div>
);
