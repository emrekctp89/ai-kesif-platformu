import { createClient } from "@/utils/supabase/server";
import { Suspense } from "react";
import { HomepageClient } from "@/components/HomepageClient";
import { FeaturedTools } from "@/components/FeaturedTools";
import { TrendingTools } from "@/components/TrendingTools";
import { ToolOfTheDay } from "@/components/ToolOfTheDay";
import { cn } from "../lib/utils.js";
import { SpeedInsights } from "@vercel/speed-insights/next" 

// Bu fonksiyon, sayfa için gerekli olan tüm verileri sunucuda tek seferde çeker.
async function getPageData(searchParams) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: favorites } = user
    ? await supabase.from("favorites").select("tool_id").eq("user_id", user.id)
    : { data: [] };

  const favoriteToolIds = new Set(favorites?.map((f) => f.tool_id) || []);

  const { fetchMoreTools } = await import("@/app/actions");
  const initialTools = await fetchMoreTools({ page: 0, searchParams });

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("name, slug")
    .order("name");

  const { data: allTagsData } = await supabase
    .from("tags")
    .select("*")
    .order("name");

  return {
    user,
    favoriteToolIds,
    initialTools,
    categories: categoriesData || [],
    allTags: allTagsData || [],
  };
}

export default async function HomePage({ searchParams }) {
  // Tüm verileri sunucuda çekiyoruz
  const initialData = await getPageData(searchParams);

  // Keşif bölümlerini burada, bir Server Component olarak oluşturuyoruz
  const discoverySections = (
    <div className="space-y-12">
      <ToolOfTheDay />
      <FeaturedTools />
    {/* Burada Speed Insights'ı da ekliyoruz */}
      <SpeedInsights url="https://your-website-url.com" />
    </div>
  );

  // Hem verileri HEM DE hazır oluşturulmuş sunucu bileşenlerini
  // interaktif mantığı yönetecek olan Client Component'e aktarıyoruz.
  return (
    <HomepageClient
      initialData={initialData}
      searchParams={searchParams}
      discoverySections={discoverySections}
    />
  );
}
