"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/SearchInput";
import { FilterSheet } from "@/components/FilterSheet";
import { InfiniteToolsList } from "@/components/InfiniteToolsList";
import { ToolsGridSkeleton } from "@/components/ToolsGridSkeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";

export function HomepageClient({
  initialData,
  searchParams: serverSearchParams,
  discoverySections,
  pageTitle = "Tüm Araçlar",
  pageDescription = "Yapay zeka dünyasını keşfedin veya aradığınızı anında bulun.",
  fixedSearchParams,
}) {
  const { user, favoriteToolIds, initialTools, categories, allTags } =
    initialData;

  const searchParams = useSearchParams();

  // Herhangi bir filtrenin aktif olup olmadığını kontrol ediyoruz.
  const hasActiveFilters = useMemo(() => {
    if (fixedSearchParams && Object.keys(fixedSearchParams).length > 0) {
      return true;
    }

    const keys = Array.from(searchParams.keys());
    return keys.some((key) => key !== "page");
  }, [fixedSearchParams, searchParams]);

  const [showDiscovery, setShowDiscovery] = useState(!hasActiveFilters);
  const [showControls] = useState(true);

  useEffect(() => {
    if (hasActiveFilters) {
      setShowDiscovery(false);
    }
  }, [hasActiveFilters]);

  return (
    <div className="space-y-12">
      {/* Üst Başlık ve Arama/Filtre Kontrolleri */}
      <div
        className="sticky top-16 z-40 border-b py-4 text-center sm:py-6 md:py-8
             bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
          {pageTitle}
        </h1>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground sm:mt-2 sm:text-base">
          {pageDescription}
        </p>

        {showControls && (
            <div className="mt-4 flex flex-col items-stretch justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 sm:flex-row sm:items-center sm:gap-3 md:mt-6">
              <SearchInput />
              <FilterSheet categories={categories} allTags={allTags} />
              <Button
  variant="outline"
  onClick={() => setShowDiscovery(!showDiscovery)}
  className="h-10 w-full group text-white border-none shadow-xl bg-gradient-to-r from-[#7F00FF] via-[#00BFFF] to-[#FF1493] bg-[length:200%_200%] animate-[gradientShift_6s_ease_infinite] sm:w-auto"
>
  {showDiscovery ? (
    <X className="mr-2 h-4 w-4" />
  ) : (
    <Sparkles className="mr-2 h-4 w-4" />
  )}
  {showDiscovery ? "Keşfi Gizle" : "Keşfet"}
</Button>



            </div>
        )}
      </div>

      {/* Keşif Bölümü */}
      {showDiscovery && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            {discoverySections}
            <div className="w-full border-t border-dashed mt-12"></div>
          </div>
      )}

      {/* Sonsuz Kaydırma Listesi */}
      <div className="mt-12">
        <Suspense
          key={searchParams.toString()}
          fallback={<ToolsGridSkeleton />}
        >
          <InfiniteToolsList
            initialTools={initialTools}
            searchParams={searchParams}
            fixedSearchParams={fixedSearchParams}
            user={user}
            favoriteToolIds={favoriteToolIds}
          />
        </Suspense>
      </div>
    </div>
  );
}
