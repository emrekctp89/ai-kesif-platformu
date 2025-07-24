import { createClient } from "../../utils/supabase/actions.js"; // sunucu tarafı istemci
const URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3005";

export async function GET() {
  const supabase = createClient();

  const { data: tools } = await supabase
    .from("tools")
    .select("slug, updated_at")
    .eq("is_approved", true);

  const { data: posts } = await supabase
    .from("posts")
    .select("slug, updated_at")
    .eq("status", "Yayınlandı");

  const urls = [
    { url: URL, lastModified: new Date().toISOString() },
    { url: `${URL}/blog`, lastModified: new Date().toISOString() },
    { url: `${URL}/tavsiye`, lastModified: new Date().toISOString() },
    { url: `${URL}/hakkimizda`, lastModified: new Date().toISOString() },
    { url: `${URL}/iletisim`, lastModified: new Date().toISOString() },
    { url: `${URL}/gizlilik`, lastModified: new Date().toISOString() },
    { url: `${URL}/kullanim-kosullari`, lastModified: new Date().toISOString() },
    ...tools?.map(({ slug, updated_at }) => ({
      url: `${URL}/tool/${slug}`,
      lastModified: new Date(updated_at).toISOString(),
    })) ?? [],
    ...posts?.map(({ slug, updated_at }) => ({
      url: `${URL}/blog/${slug}`,
      lastModified: new Date(updated_at).toISOString(),
    })) ?? [],
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ url, lastModified }) => `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastModified}</lastmod>
  </url>`
  )
  .join("")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
