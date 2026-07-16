import { getSiteOrigin } from '@/utils/siteUrl';

export default function robots() {
  const siteUrl = getSiteOrigin();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
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
