// Bu dosya, sitenizin kökünde /robots.txt olarak sunulur.

export default function robots() {
  const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aikeşif.com').origin;
  return {
    rules: {
      // Tüm arama motorlarına (User-agent: *)
      userAgent: '*',
      // Ana sayfa ve tüm alt sayfaları taramasına izin ver
      allow: '/',
      // Ancak bu özel sayfaları taramasını engelle
      disallow: [
        '/admin/',
        '/dashboard/',
        '/profile/',
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/mesajlar/',
        '/auth/',
        '/api/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
