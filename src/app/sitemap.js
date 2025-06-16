import { createClient } from "@/utils/supabase/server";

// Bu, sitemizin ana URL'idir. .env.local dosyasından alınması en doğrusu.
const URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3005";

export default async function sitemap() {
  const supabase = createClient();

  // 1. Veritabanından tüm araçların slug'larını ve en son güncellenme tarihlerini çekiyoruz
  const { data: tools } = await supabase
    .from("tools")
    .select("slug, updated_at")
    .eq("is_approved", true);

  const toolUrls =
    tools?.map(({ slug, updated_at }) => ({
      url: `${URL}/tool/${slug}`,
      lastModified: new Date(updated_at).toISOString(),
    })) ?? [];

  // 2. Veritabanından tüm yayınlanmış blog yazılarının slug'larını ve tarihlerini çekiyoruz
  const { data: posts } = await supabase
    .from("posts")
    .select("slug, updated_at")
    .eq("status", "Yayınlandı");

  const postUrls =
    posts?.map(({ slug, updated_at }) => ({
      url: `${URL}/blog/${slug}`,
      lastModified: new Date(updated_at).toISOString(),
    })) ?? [];

  // 3. Statik sayfalarımızı manuel olarak ekliyoruz
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

  // 4. Tüm URL listelerini birleştirip döndürüyoruz
  return [...staticUrls, ...toolUrls, ...postUrls];
}
