import { createClient } from "@/utils/supabase/server";
import { HomepageClient } from "@/components/HomepageClient";
import { FeaturedTools } from "@/components/FeaturedTools";
import { TrendingTools } from "@/components/TrendingTools";
import { ToolOfTheDay } from "@/components/ToolOfTheDay";

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
  const initialData = await getPageData(searchParams);

  const discoverySections = (
    <div className="space-y-12">
      <ToolOfTheDay />
      <FeaturedTools />
      <TrendingTools />
    </div>
  );

  return (
    <HomepageClient
      initialData={initialData}
      searchParams={searchParams}
      discoverySections={discoverySections}
    />
  );
}
