import { getSiteOrigin } from '@/utils/siteUrl';

const PRIVATE_PATHS = [
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
  '/studyo/',
  '/settings/',
];

function withLocales(paths) {
  const out = [];
  for (const path of paths) {
    out.push(path);
    // English locale prefix (next-intl unprefixed default is TR)
    if (path.startsWith('/') && !path.startsWith('/en')) {
      out.push(`/en${path}`);
    }
  }
  return out;
}

export default function robots() {
  const siteUrl = getSiteOrigin();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: withLocales(PRIVATE_PATHS),
      },
      {
        // Reduce crawl noise from aggressive SEO bots on private surfaces
        userAgent: ['GPTBot', 'CCBot', 'Google-Extended'],
        allow: ['/', '/tool/', '/kategori/', '/blog/', '/kesfet', '/karsilastir'],
        disallow: withLocales(['/admin/', '/dashboard/', '/api/', '/profile/', '/auth/']),
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
