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
}) {
  const { user, favoriteToolIds, initialTools, categories, allTags } =
    initialData;

  const searchParams = useSearchParams();

  // Herhangi bir filtrenin aktif olup olmadığını kontrol ediyoruz.
  const hasActiveFilters = useMemo(() => {
    const keys = Array.from(searchParams.keys());
    return keys.some((key) => key !== "page");
  }, [searchParams]);

  const [showDiscovery, setShowDiscovery] = useState(!hasActiveFilters);
  const [showControls, setShowControls] = useState(hasActiveFilters);

  useEffect(() => {
    if (hasActiveFilters) {
      setShowDiscovery(false);
      setShowControls(true);
    }
  }, [hasActiveFilters]);

  return (
    <div className="space-y-12">
      {/* Üst Başlık ve Arama/Filtre Kontrolleri */}
      <div
        className="text-center sticky top-16 z-40 py-8 border-b 
             bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"

        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          if (!hasActiveFilters) {
            setShowControls(false);
          }
        }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Tüm Araçlar
        </h1>
        <p className="mt-2 text-muted-foreground">
          Yapay zeka dünyasını keşfedin veya aradığınızı anında bulun.
        </p>

        {showControls && (
            <div className="flex justify-center items-center gap-4 mt-6 animate-in fade-in slide-in-from-top-2 duration-200">
              <SearchInput />
              <FilterSheet categories={categories} allTags={allTags} />
              <Button
  variant="outline"
  onClick={() => setShowDiscovery(!showDiscovery)}
  className="h-full group text-white border-none shadow-xl bg-gradient-to-r from-[#7F00FF] via-[#00BFFF] to-[#FF1493] bg-[length:200%_200%] animate-[gradientShift_6s_ease_infinite]"
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
            user={user}
            favoriteToolIds={favoriteToolIds}
          />
        </Suspense>
      </div>
    </div>
  );
}
