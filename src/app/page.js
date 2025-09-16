import { createClient } from "@/utils/supabase/server";
import { HomepageClient } from "@/components/HomepageClient";
import { fetchMoreTools } from "@/app/actions";

// Eski keşif bölümü (istersen tekrar açabilirsin)
// import { FeaturedTools } from "@/components/FeaturedTools";
// import { TrendingTools } from "@/components/TrendingTools";
// import { ToolOfTheDay } from "@/components/ToolOfTheDay";

async function getPageData(searchParams) {
  const supabase = createClient();

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
    initialTools,
    categories: categoriesData || [],
    allTags: allTagsData || [],
  };
}

export default async function HomePage({ searchParams }) {
  const initialData = await getPageData(searchParams);

  // İstersen tekrar aktif edebilirsin:
  // const discoverySections = (
  //   <div className="space-y-12">
  //     <ToolOfTheDay />
  //     <FeaturedTools />
  //     <TrendingTools />
  //   </div>
  // );

  return (
    <HomepageClient
      initialData={initialData}
      searchParams={searchParams}
      // discoverySections={discoverySections}
    />
  );
}
