// Eğer src/app/sitemap.js içindeysen ve server.ts bir üst klasördeyse:
// Düzeltildi: supabase middleware dosyasının doğru yolu
//import { supabase } from "../utils/supabase/middleware.js";

//import { supabase } from "../utils/supabase/middleware.js"; // Supabase istemcisini içe aktarıyoruz
//import { updateSession } from '../utils/supabase/middleware.js'

//import process from "node:process";

// Bu, sitemizin ana URL'idir. .env.local dosyasından alınması en doğrusu.
const URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3005";

export default async function sitemap() {
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

  // 2. Yayınlanan blog yazıları
  const { data: posts } = await supabase
    .from("posts")
    .select("slug, updated_at")
    .eq("status", "Yayınlandı");

  const postUrls =
    posts?.map(({ slug, updated_at }) => ({
      url: `${URL}/blog/${slug}`,
      lastModified: new Date(updated_at).toISOString(),
    })) ?? [];

  // 3. Statik sayfalar
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

  // 4. Hepsini birleştir ve döndür
  return [...staticUrls, ...toolUrls, ...postUrls];
}
