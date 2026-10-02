import logger from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import { getSiteOrigin } from '@/utils/siteUrl';

const SITE_URL = getSiteOrigin();

export const revalidate = 3600;

function withBase(path = '') {
  return `${SITE_URL}${path}`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function GET() {
  // Paused community/explore surfaces intentionally omitted (soft landing + noindex).
  const urls = [
    { url: withBase('/') },
    { url: withBase('/kategori') },
    { url: withBase('/ogren') },
    { url: withBase('/ogren/kasif') },
    { url: withBase('/workmind') },
    { url: withBase('/blog') },
    { url: withBase('/arastirma') },
    { url: withBase('/karsilastir') },
    { url: withBase('/tavsiye') },
    { url: withBase('/bulten') },
    { url: withBase('/hakkimizda') },
    { url: withBase('/iletisim') },
    { url: withBase('/gizlilik') },
    { url: withBase('/kullanim-kosullari') },
    { url: withBase('/submit') },
    { url: withBase('/developer') },
  ];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return createSitemapResponse(urls);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  let toolsData = [];
  let categoriesData = [];
  let newslettersData = [];

  try {
    const [toolsResult, categoriesResult, newslettersResult] = await Promise.all([
      supabase
        .from('tools')
        .select('slug, updated_at')
        .eq('is_approved', true)
        .not('slug', 'is', null),
      supabase.from('categories').select('slug').not('slug', 'is', null),
      supabase.from('newsletters').select('slug, sent_at, updated_at').not('slug', 'is', null),
    ]);

    if (toolsResult.error) {
      logger.error('Araçlar alınamadı:', toolsResult.error);
    } else {
      toolsData = toolsResult.data || [];
    }

    if (categoriesResult.error) {
      logger.error('Kategoriler alınamadı:', categoriesResult.error);
    } else {
      categoriesData = categoriesResult.data || [];
    }

    if (newslettersResult.error) {
      logger.error('Bültenler alınamadı:', newslettersResult.error);
    } else {
      newslettersData = newslettersResult.data || [];
    }
  } catch (error) {
    logger.error('Sitemap fetch failed (likely during build):', error);
  }

  categoriesData.forEach((category) => {
    urls.push({
      url: withBase(`/kategori/${category.slug}`),
    });
  });

  toolsData.forEach((tool) => {
    urls.push({
      url: withBase(`/tool/${tool.slug}`),
      ...(tool.updated_at ? { lastModified: tool.updated_at } : {}),
    });
    urls.push({
      url: withBase(`/en/tool/${tool.slug}`),
      ...(tool.updated_at ? { lastModified: tool.updated_at } : {}),
    });
  });

  newslettersData.forEach((item) => {
    urls.push({
      url: withBase(`/bulten/${item.slug}`),
      ...(item.updated_at || item.sent_at ? { lastModified: item.updated_at || item.sent_at } : {}),
    });
  });

  return createSitemapResponse(urls);
}

function createSitemapResponse(urls) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ url, lastModified }) => `
  <url>
    <loc>${escapeXml(url)}</loc>${
      lastModified
        ? `
    <lastmod>${escapeXml(lastModified)}</lastmod>`
        : ''
    }
  </url>`
  )
  .join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
