"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SearchInput } from "@/components/SearchInput";
import { FilterSheet } from "@/components/FilterSheet";
import { InfiniteToolsList } from "@/components/InfiniteToolsList";
import { ToolsGridSkeleton } from "@/components/ToolsGridSkeleton";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/utils/analytics";
import {
  ArrowRight,
  Code2,
  ImageIcon,
  Megaphone,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";

const quickStarts = [
  {
    href: "/kategori/gorsel-video",
    label: "Görsel ve video üret",
    icon: ImageIcon,
  },
  {
    href: "/kategori/pazarlama",
    label: "Pazarlama içeriği hazırla",
    icon: Megaphone,
  },
  {
    href: "/kategori/kod-yazilim",
    label: "Kodlama aracını bul",
    icon: Code2,
  },
];

const sortLabels = {
  rating: "En yüksek puanlı",
  popularity: "En çok oylanan",
};

export function HomepageClient({
  initialData,
  searchParams: serverSearchParams,
  discoverySections,
  pageTitle = "İhtiyacına Uygun Yapay Zeka Aracını Bul",
  pageDescription = "Ne yapmak istediğini ara, kategorileri keşfet veya AI tavsiyesiyle doğru araca daha hızlı ulaş.",
  fixedSearchParams,
}) {
  const { user, favoriteToolIds, initialTools, categories, allTags } =
    initialData;

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const searchParamsString = searchParams.toString();
  const activeFilters = useMemo(() => {
    const filters = [];
    const categoryNames = new Map(
      categories.map((category) => [category.slug, category.name])
    );
    const tagNames = new Map(allTags.map((tag) => [String(tag.id), tag.name]));
    const addFilter = ({ key, value, label, multiValue }) => {
      const nextParams = new URLSearchParams(searchParamsString);

      if (multiValue) {
        const remainingValues = (nextParams.get(key) || "")
          .split(",")
          .filter((item) => item && item !== value);

        if (remainingValues.length > 0) {
          nextParams.set(key, remainingValues.join(","));
        } else {
          nextParams.delete(key);
        }
      } else {
        nextParams.delete(key);
      }

      nextParams.delete("page");
      const query = nextParams.toString();
      filters.push({
        id: `${key}-${value}`,
        label,
        href: query ? `${pathname}?${query}` : pathname,
      });
    };

    const search = searchParams.get("search");
    if (search) {
      const shortenedSearch =
        search.length > 32 ? `${search.slice(0, 32)}…` : search;
      addFilter({
        key: "search",
        value: search,
        label: `Arama: “${shortenedSearch}”`,
      });
    }

    const category = searchParams.get("category");
    if (category) {
      addFilter({
        key: "category",
        value: category,
        label: `Kategori: ${categoryNames.get(category) || category}`,
      });
    }

    (searchParams.get("tags") || "")
      .split(",")
      .filter(Boolean)
      .forEach((tagId) =>
        addFilter({
          key: "tags",
          value: tagId,
          label: `Etiket: ${tagNames.get(tagId) || `#${tagId}`}`,
          multiValue: true,
        })
      );

    const pricing = searchParams.get("pricing");
    if (pricing) {
      addFilter({
        key: "pricing",
        value: pricing,
        label: `Fiyat: ${pricing}`,
      });
    }

    (searchParams.get("platforms") || "")
      .split(",")
      .filter(Boolean)
      .forEach((platform) =>
        addFilter({
          key: "platforms",
          value: platform,
          label: `Platform: ${platform}`,
          multiValue: true,
        })
      );

    const sort = searchParams.get("sort");
    if (sort) {
      addFilter({
        key: "sort",
        value: sort,
        label: `Sıralama: ${sortLabels[sort] || sort}`,
      });
    }

    return filters;
  }, [allTags, categories, pathname, searchParams, searchParamsString]);
  const hasUserFilters = activeFilters.length > 0;

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
    <div className="space-y-8 sm:space-y-12">
      {/* Üst Başlık ve Arama/Filtre Kontrolleri */}
      <div
        className="sticky top-16 z-40 border-b px-3 py-2 text-center sm:px-4 sm:py-5 md:py-7
             bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <h1 id="tools-page-title" className="text-xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
          {pageTitle}
        </h1>
        <p className="mx-auto mt-1 hidden max-w-xl text-sm text-muted-foreground sm:block sm:mt-2 sm:text-base">
          {pageDescription}
        </p>

        {showControls && (
            <div className="mt-2 grid grid-cols-2 items-stretch justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 sm:mt-4 sm:flex sm:items-center sm:gap-3 md:mt-6">
              <div className="col-span-2 sm:col-span-1 sm:min-w-80 sm:flex-1">
              <SearchInput key={searchParams.get("search") || "empty-search"} />
              </div>
              <FilterSheet
                categories={categories}
                allTags={allTags}
                fixedSearchParams={fixedSearchParams}
              />
              <Button
  variant="outline"
  onClick={() => setShowDiscovery(!showDiscovery)}
  className="h-9 w-full group text-white border-none shadow-xl bg-gradient-to-r from-[#7F00FF] via-[#00BFFF] to-[#FF1493] bg-[length:200%_200%] animate-[gradientShift_6s_ease_infinite] sm:h-10 sm:w-auto"
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

      {hasUserFilters && (
        <section
          className="rounded-xl border bg-muted/35 px-4 py-3"
          aria-labelledby="active-filters-heading"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="active-filters-heading" className="text-sm font-semibold">
                {activeFilters.length} ölçüt etkin
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Kaldırmak istediğin ölçüte dokunabilirsin.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="self-start sm:self-auto">
              <Link href={pathname} scroll={false}>
                Tümünü temizle
                <X aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Link
                key={filter.id}
                href={filter.href}
                scroll={false}
                aria-label={`${filter.label} ölçütünü kaldır`}
                onClick={() =>
                  trackEvent("active_filter_remove", {
                    filter_type: filter.id.split("-")[0],
                    remaining_filter_count: activeFilters.length - 1,
                  })
                }
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-destructive/50 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>{filter.label}</span>
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {!fixedSearchParams && !hasActiveFilters && (
        <section
          aria-labelledby="quick-start-heading"
          className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-purple-500/5 p-4 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <WandSparkles aria-hidden="true" className="h-4 w-4" />
                Hızlı başlangıç
              </div>
              <h2
                id="quick-start-heading"
                className="mt-2 text-xl font-bold tracking-tight sm:text-2xl"
              >
                Nereden başlayacağını bilmiyor musun?
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                İhtiyacını birkaç cümleyle anlat; AI Tavsiye sana uygun araçları
                kısa bir liste halinde sunsun.
              </p>
            </div>

            <Button asChild size="lg" className="min-h-12 shrink-0">
              <Link
                href="/tavsiye"
                prefetch={false}
                onClick={() =>
                  trackEvent("recommendation_cta_click", {
                    source: "homepage_quick_start",
                  })
                }
              >
                AI ile araç bul
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
            <span className="mr-1 self-center text-xs font-medium text-muted-foreground">
              Popüler amaçlar:
            </span>
            {quickStarts.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                onClick={() =>
                  trackEvent("quick_start_click", {
                    destination: href,
                    label,
                  })
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-full border bg-background px-3 py-2 text-xs font-semibold transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Keşif Bölümü */}
      {showDiscovery && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            {discoverySections}
            <div className="w-full border-t border-dashed mt-12"></div>
          </div>
      )}

      {/* Sonsuz Kaydırma Listesi */}
      <section className="mt-12" aria-labelledby="tools-page-title">
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
            hasUserFilters={hasUserFilters}
          />
        </Suspense>
      </section>
    </div>
  );
}
