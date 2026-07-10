import { createClient } from '@supabase/supabase-js';

const SITE_URL = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aikesif.com').origin;

export const revalidate = 3600; // Cache for 1 hour

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  let toolsData = [];
  let postsData = [];

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
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

      const [toolsResult, postsResult] = await Promise.all([
        supabase
          .from('tools')
          .select('name, description, slug, created_at')
          .eq('is_approved', true)
          .not('slug', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('posts')
          .select('title, description, slug, published_at')
          .eq('status', 'Yayınlandı')
          .not('slug', 'is', null)
          .order('published_at', { ascending: false })
          .limit(20),
      ]);

      if (toolsResult.data) toolsData = toolsResult.data;
      if (postsResult.data) postsData = postsResult.data;
    }
  } catch (error) {
    console.error('RSS fetch failed:', error);
  }

  const items = [];

  toolsData.forEach((tool) => {
    items.push(`
    <item>
      <title>${escapeXml(tool.name)}</title>
      <link>${SITE_URL}/tool/${escapeXml(tool.slug)}</link>
      <guid>${SITE_URL}/tool/${escapeXml(tool.slug)}</guid>
      <pubDate>${new Date(tool.created_at || new Date()).toUTCString()}</pubDate>
      <description>${escapeXml(tool.description)}</description>
    </item>`);
  });

  postsData.forEach((post) => {
    items.push(`
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/blog/${escapeXml(post.slug)}</link>
      <guid>${SITE_URL}/blog/${escapeXml(post.slug)}</guid>
      <pubDate>${new Date(post.published_at || new Date()).toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
    </item>`);
  });

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI Keşif Platformu</title>
    <link>${SITE_URL}</link>
    <description>Yapay zeka araçlarını keşfet, karşılaştır, test et ve toplulukla paylaş.</description>
    <language>tr</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    ${items.join('')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
