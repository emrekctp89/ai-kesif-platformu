"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SearchInput } from "@/components/SearchInput";
import { FilterSheet } from "@/components/FilterSheet";
import { InfiniteToolsList } from "@/components/InfiniteToolsList";
import { ToolsGridSkeleton } from "@/components/ToolsGridSkeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
// Animasyonlar için Framer Motion'ı import ediyoruz
import { motion, AnimatePresence } from "framer-motion";

export function HomepageClient({
  initialData,
  searchParams,
  discoverySections,
}) {
  const { user, favoriteToolIds, initialTools, categories, allTags } =
    initialData;

  const hasActiveFilters =
    Object.keys(searchParams).length > 0 &&
    (Object.keys(searchParams).length !== 1 || !searchParams.page);

  const [showDiscovery, setShowDiscovery] = useState(!hasActiveFilters);
  // DEĞİŞİKLİK: Filtrelerin görünürlüğünü kontrol eden yeni state
  const [showControls, setShowControls] = useState(hasActiveFilters);

  useEffect(() => {
    if (hasActiveFilters) {
      setShowDiscovery(false);
      setShowControls(true); // Bir filtre aktifse, kontrolleri her zaman göster
    }
  }, [hasActiveFilters]);

  return (
    <div className="space-y-12">
      {/* Üst Kısım: Başlık ve Filtreler */}
      <div
        className="text-center pt-8 sticky top-16 bg-background/95 backdrop-blur-sm z-40 py-4 border-b"
        // DEĞİŞİKLİK: Fare olaylarını dinleyen kapsayıcı
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          // Sadece bir filtre aktif değilse, fare ayrıldığında gizle
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

        {/* DEĞİŞİKLİK: Kontroller artık animasyonlu bir şekilde görünüp kayboluyor */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex justify-center items-center gap-4 mt-6"
            >
              <SearchInput />
              <FilterSheet categories={categories} allTags={allTags} />
              <Button
                variant="outline"
                onClick={() => setShowDiscovery(!showDiscovery)}
              >
                {showDiscovery ? (
                  <X className="mr-2 h-4 w-4" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {showDiscovery ? "Keşfi Gizle" : "Keşfet"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showDiscovery && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="animate-in fade-in-50"
          >
            {discoverySections}
            <div className="w-full border-t border-dashed mt-12"></div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-12">
        <Suspense
          key={JSON.stringify(searchParams)}
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
