import { createClient } from "@/utils/supabase/server";
import { Suspense } from "react";
import Link from "next/link";
import { CategorySelect } from "@/components/CategorySelect";
import { SortSelect } from "@/components/SortSelect";
import { FeaturedTools } from "@/components/FeaturedTools";
import { TrendingTools } from "@/components/TrendingTools";
import { ToolsList } from "@/components/ToolsList";
import { ToolsGridSkeleton } from "@/components/ToolsGridSkeleton";
import { TagFilter } from "@/components/TagFilter";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { SearchInput } from "@/components/SearchInput";
import { Button } from "@/components/ui/button";
// Yeni Aktivite Akışı bileşenini import ediyoruz
import { ActivityFeed } from "@/components/ActivityFeed";

// Misafirler için gerekli olan veri çekme fonksiyonları
async function getCategories() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("name, slug");
  if (error) {
    console.error("Kategori çekme hatası:", error);
    return [];
  }
  return data;
}

async function getAllTags() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    console.error("Tüm etiketleri çekerken hata:", error);
    return [];
  }
  return data;
}

// Misafir Kullanıcı Arayüzü
async function GuestHomepage({ searchParams, user, favoriteToolIds }) {
  const [categories, allTags] = await Promise.all([
    getCategories(),
    getAllTags(),
  ]);

  return (
    <>
      <ToolOfTheDay />
      <FeaturedTools />
      <TrendingTools />

      <div className="text-center mb-10 pt-8">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Tüm Araçlar
        </h2>
      </div>

      <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-10">
        <form className="flex gap-2 w-full md:w-auto md:flex-grow max-w-md">
          <SearchInput />
          <Button type="submit">Ara</Button>
        </form>
        <div className="flex flex-wrap justify-center gap-2">
          <CategorySelect categories={categories} />
          <SortSelect />
          <TagFilter allTags={allTags} />
          <AdvancedFilters />
        </div>
      </div>

      <Suspense
        key={JSON.stringify(searchParams)}
        fallback={<ToolsGridSkeleton />}
      >
        <ToolsList
          searchParams={searchParams}
          user={user}
          favoriteToolIds={favoriteToolIds}
        />
      </Suspense>
    </>
  );
}

// Ana Sayfa Bileşeni
export default async function HomePage({ searchParams }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      {user ? (
        // Eğer kullanıcı GİRİŞ YAPMIŞSA, Topluluk Akışını göster
        <ActivityFeed />
      ) : (
        // Eğer kullanıcı MİSAFİRSE, eski ana sayfayı göster
        <GuestHomepage
          searchParams={searchParams}
          user={null}
          favoriteToolIds={new Set()}
        />
      )}
    </div>
  );
}

// ToolOfTheDay gibi diğer bileşenlerin import edildiğini varsayıyoruz.
// Eksikse ekleyelim:
import { ToolOfTheDay } from "@/components/ToolOfTheDay";
