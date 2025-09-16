"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/SearchInput";
import { FilterSheet } from "@/components/FilterSheet";
import { InfiniteToolsList } from "@/components/InfiniteToolsList";
import { ToolsGridSkeleton } from "@/components/ToolsGridSkeleton";
import { motion, AnimatePresence } from "framer-motion";

function HomepageClientContent({ initialData, discoverySections }) {
  const { initialTools, categories, allTags } = initialData;
  const searchParams = useSearchParams();

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
      <div
        className="text-center pt-8 sticky top-16 bg-background/95 backdrop-blur-sm z-40 py-4 border-b"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          if (!hasActiveFilters) setShowControls(false);
        }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Tüm Araçlar
        </h1>
        <p className="mt-2 text-muted-foreground">
          Yapay zeka dünyasını keşfedin veya aradığınızı anında bulun.
        </p>

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
        <Suspense fallback={<ToolsGridSkeleton />}>
          <InfiniteToolsList
            initialTools={initialTools}
            searchParams={searchParams}
          />
        </Suspense>
      </div>
    </div>
  );
}

// Suspense boundary wrapper
export function HomepageClient(props) {
  return (
    <Suspense fallback={<ToolsGridSkeleton />}>
      <HomepageClientContent {...props} />
    </Suspense>
  );
}
