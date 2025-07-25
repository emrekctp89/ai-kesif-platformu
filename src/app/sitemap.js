import { createClient } from "../utils/supabase/actions.js"; // sunucu tarafı istemci
const URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3005";

export default async function sitemap() {
  const supabase = createClient();

  // Araçlar (tools)
  const { data: tools } = await supabase
    .from("tools")
    .select("slug, updated_at")
    .eq("is_approved", true);

  const toolUrls =
    tools?.map(({ slug, updated_at }) => ({
      url: `${URL}/tool/${slug}`,
      lastModified: new Date(updated_at).toISOString(),
    })) ?? [];

  // Blog yazıları
  const { data: posts } = await supabase
    .from("posts")
    .select("slug, updated_at")
    .eq("status", "Yayınlandı");

  const postUrls =
    posts?.map(({ slug, updated_at }) => ({
      url: `${URL}/blog/${slug}`,
      lastModified: new Date(updated_at).toISOString(),
    })) ?? [];

  // Statik sayfalar
  const staticUrls = [
    { url: URL, lastModified: new Date().toISOString() },
    { url: `${URL}/blog`, lastModified: new Date().toISOString() },
    { url: `${URL}/tavsiye`, lastModified: new Date().toISOString() },
    { url: `${URL}/hakkimizda`, lastModified: new Date().toISOString() },
    { url: `${URL}/iletisim`, lastModified: new Date().toISOString() },
    { url: `${URL}/gizlilik`, lastModified: new Date().toISOString() },
    {
      url: `${URL}/kullanim-kosullari`,
      lastModified: new Date().toISOString(),
    },
  ];

  // Hepsini birleştirip return et
  return [...staticUrls, ...toolUrls, ...postUrls];
}
