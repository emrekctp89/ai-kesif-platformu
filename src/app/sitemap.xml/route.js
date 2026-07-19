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

/** Static marketing / product routes (TR + optional EN mirror). */
const STATIC_ROUTES = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/kesfet', priority: 0.9, changeFrequency: 'daily' },
  { path: '/kategori', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/karsilastir', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/tavsiye', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.7, changeFrequency: 'daily' },
  { path: '/bulten', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/eserler', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/koleksiyonlar', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/topluluk', priority: 0.6, changeFrequency: 'daily' },
  { path: '/leaderboard', priority: 0.5, changeFrequency: 'daily' },
  { path: '/ogren', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/random-tools', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/workmind', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/hakkimizda', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/iletisim', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/gizlilik', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/kullanim-kosullari', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/submit', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/developer', priority: 0.4, changeFrequency: 'monthly' },
];

function pushLocalizedStatic(urls, generatedAt) {
  for (const route of STATIC_ROUTES) {
    urls.push({
      url: withBase(route.path === '/' ? '' : route.path),
      lastModified: generatedAt,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    });
    // English mirrors (default locale is unprefixed TR)
    const enPath = route.path === '/' ? '/en' : `/en${route.path}`;
    urls.push({
      url: withBase(enPath),
      lastModified: generatedAt,
      changeFrequency: route.changeFrequency,
      priority: Math.max(0.1, Number((route.priority - 0.05).toFixed(2))),
    });
  }
}

export async function GET() {
  const generatedAt = new Date().toISOString();
  const urls = [];
  pushLocalizedStatic(urls, generatedAt);

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
  let postsData = [];

  try {
    const [toolsResult, categoriesResult, newslettersResult, postsResult] = await Promise.all([
      supabase
        .from('tools')
        .select('slug, updated_at')
        .eq('is_approved', true)
        .not('slug', 'is', null),
      supabase.from('categories').select('slug').not('slug', 'is', null),
      supabase.from('newsletters').select('slug, sent_at, updated_at').not('slug', 'is', null),
      supabase
        .from('posts')
        .select('slug, published_at, updated_at')
        .eq('status', 'Yayınlandı')
        .not('slug', 'is', null),
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

    if (postsResult.error) {
      // posts table may be empty / restricted — non-fatal
      logger.warn('Blog yazıları sitemap için alınamadı:', postsResult.error);
    } else {
      postsData = postsResult.data || [];
    }
  } catch (error) {
    logger.error('Sitemap fetch failed (likely during build):', error);
  }

  categoriesData.forEach((category) => {
    urls.push({
      url: withBase(`/kategori/${category.slug}`),
      lastModified: generatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
    urls.push({
      url: withBase(`/en/kategori/${category.slug}`),
      lastModified: generatedAt,
      changeFrequency: 'weekly',
      priority: 0.65,
    });
  });

  toolsData.forEach((tool) => {
    const lastModified = tool.updated_at || generatedAt;
    urls.push({
      url: withBase(`/tool/${tool.slug}`),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
    urls.push({
      url: withBase(`/en/tool/${tool.slug}`),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.75,
    });
  });

  newslettersData.forEach((item) => {
    urls.push({
      url: withBase(`/bulten/${item.slug}`),
      lastModified: item.updated_at || item.sent_at || generatedAt,
      changeFrequency: 'monthly',
      priority: 0.5,
    });
  });

  postsData.forEach((post) => {
    const lastModified = post.updated_at || post.published_at || generatedAt;
    urls.push({
      url: withBase(`/blog/${post.slug}`),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
    urls.push({
      url: withBase(`/en/blog/${post.slug}`),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.55,
    });
  });

  return createSitemapResponse(urls);
}

function createSitemapResponse(urls) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(({ url, lastModified, changeFrequency, priority }) => {
    const lastmod = escapeXml(
      lastModified instanceof Date
        ? lastModified.toISOString()
        : new Date(lastModified || Date.now()).toISOString()
    );
    return `
  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${lastmod}</lastmod>
    ${changeFrequency ? `<changefreq>${escapeXml(changeFrequency)}</changefreq>` : ''}
    ${priority != null ? `<priority>${escapeXml(priority)}</priority>` : ''}
  </url>`;
  })
  .join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
