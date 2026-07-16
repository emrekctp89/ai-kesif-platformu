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
  const generatedAt = new Date().toISOString();
  const urls = [
    { url: withBase('/'), lastModified: generatedAt },
    { url: withBase('/kategori'), lastModified: generatedAt },
    { url: withBase('/kesfet'), lastModified: generatedAt },
    { url: withBase('/karsilastir'), lastModified: generatedAt },
    { url: withBase('/tavsiye'), lastModified: generatedAt },
    { url: withBase('/blog'), lastModified: generatedAt },
    { url: withBase('/eserler'), lastModified: generatedAt },
    { url: withBase('/koleksiyonlar'), lastModified: generatedAt },
    { url: withBase('/topluluk'), lastModified: generatedAt },
    { url: withBase('/leaderboard'), lastModified: generatedAt },
    { url: withBase('/ogren'), lastModified: generatedAt },
    { url: withBase('/random-tools'), lastModified: generatedAt },
    { url: withBase('/hakkimizda'), lastModified: generatedAt },
    { url: withBase('/iletisim'), lastModified: generatedAt },
    { url: withBase('/gizlilik'), lastModified: generatedAt },
    { url: withBase('/kullanim-kosullari'), lastModified: generatedAt },
    { url: withBase('/submit'), lastModified: generatedAt },
    { url: withBase('/developer'), lastModified: generatedAt },
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

  try {
    const [toolsResult, categoriesResult] = await Promise.all([
      supabase
        .from('tools')
        .select('slug, updated_at')
        .eq('is_approved', true)
        .not('slug', 'is', null),
      supabase.from('categories').select('slug').not('slug', 'is', null),
    ]);

    if (toolsResult.error) {
      console.error('Araçlar alınamadı:', toolsResult.error);
    } else {
      toolsData = toolsResult.data || [];
    }

    if (categoriesResult.error) {
      console.error('Kategoriler alınamadı:', categoriesResult.error);
    } else {
      categoriesData = categoriesResult.data || [];
    }
  } catch (error) {
    console.error('Sitemap fetch failed (likely during build):', error);
  }

  categoriesData.forEach((category) => {
    urls.push({
      url: withBase(`/kategori/${category.slug}`),
      lastModified: generatedAt,
    });
  });

  toolsData.forEach((tool) => {
    urls.push({
      url: withBase(`/tool/${tool.slug}`),
      lastModified: tool.updated_at || generatedAt,
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
    <loc>${escapeXml(url)}</loc>
    <lastmod>${escapeXml(lastModified)}</lastmod>
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
