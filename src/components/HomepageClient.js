'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { SearchInput } from '@/components/SearchInput';
import { FilterSheet } from '@/components/FilterSheet';
import { InfiniteToolsList } from '@/components/InfiniteToolsList';
import { ToolsGridSkeleton } from '@/components/ToolsGridSkeleton';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/utils/analytics';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import {
  ArrowRight,
  Code2,
  ImageIcon,
  LayoutGrid,
  Megaphone,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react';

const quickStartDefs = [
  { href: '/kategori/gorsel-video', labelKey: 'goalVisual', icon: ImageIcon },
  { href: '/kategori/pazarlama', labelKey: 'goalMarketing', icon: Megaphone },
  { href: '/kategori/kod-yazilim', labelKey: 'goalCode', icon: Code2 },
  { href: '/kategori/otomasyon-ajan', labelKey: 'goalAutomation', icon: Sparkles },
  { href: '/kategori', labelKey: 'goalAllCategories', icon: LayoutGrid },
];

function formatCount(value, locale) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'tr-TR').format(n);
}

export function HomepageClient({
  initialData,
  searchParams: _serverSearchParams,
  discoverySections,
  pageTitle = 'İhtiyacına Uygun Yapay Zeka Aracını Bul',
  pageDescription = 'Ne yapmak istediğini ara, kategorileri keşfet veya AI tavsiyesiyle doğru araca daha hızlı ulaş.',
  fixedSearchParams,
  customHeader,
}) {
  const t = useTranslations('Homepage');
  const locale = useLocale();
  const {
    user,
    favoriteToolIds: favoriteToolIdsProp,
    initialTools,
    categories,
    allTags,
    stats,
  } = initialData;

  // Accept array (RSC-safe) or Set for backward compatibility
  const favoriteToolIds = useMemo(() => {
    if (favoriteToolIdsProp instanceof Set) return favoriteToolIdsProp;
    if (Array.isArray(favoriteToolIdsProp)) return new Set(favoriteToolIdsProp);
    return new Set();
  }, [favoriteToolIdsProp]);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const searchParamsString = searchParams.toString();

  const isHomeLanding = !fixedSearchParams && !customHeader;

  const sortLabels = useMemo(
    () => ({
      rating: t('sortRating'),
      popularity: t('sortPopularity'),
    }),
    [t]
  );

  const activeFilters = useMemo(() => {
    const filters = [];
    const categoryNames = new Map(categories.map((category) => [category.slug, category.name]));
    const tagNames = new Map(allTags.map((tag) => [String(tag.id), tag.name]));
    const addFilter = ({ key, value, label, multiValue }) => {
      const nextParams = new URLSearchParams(searchParamsString);

      if (multiValue) {
        const remainingValues = (nextParams.get(key) || '')
          .split(',')
          .filter((item) => item && item !== value);

        if (remainingValues.length > 0) {
          nextParams.set(key, remainingValues.join(','));
        } else {
          nextParams.delete(key);
        }
      } else {
        nextParams.delete(key);
      }

      nextParams.delete('page');
      const query = nextParams.toString();
      filters.push({
        id: `${key}-${value}`,
        label,
        href: query ? `${pathname}?${query}` : pathname,
      });
    };

    const search = searchParams.get('search');
    if (search) {
      const shortenedSearch = search.length > 32 ? `${search.slice(0, 32)}…` : search;
      addFilter({
        key: 'search',
        value: search,
        label: t('filterSearch', { value: shortenedSearch }),
      });
    }

    const category = searchParams.get('category');
    if (category) {
      addFilter({
        key: 'category',
        value: category,
        label: t('filterCategory', { value: categoryNames.get(category) || category }),
      });
    }

    (searchParams.get('tags') || '')
      .split(',')
      .filter(Boolean)
      .forEach((tagId) =>
        addFilter({
          key: 'tags',
          value: tagId,
          label: t('filterTag', { value: tagNames.get(tagId) || `#${tagId}` }),
          multiValue: true,
        })
      );

    const pricing = searchParams.get('pricing');
    if (pricing) {
      addFilter({
        key: 'pricing',
        value: pricing,
        label: t('filterPricing', { value: pricing }),
      });
    }

    (searchParams.get('platforms') || '')
      .split(',')
      .filter(Boolean)
      .forEach((platform) =>
        addFilter({
          key: 'platforms',
          value: platform,
          label: t('filterPlatform', { value: platform }),
          multiValue: true,
        })
      );

    const sort = searchParams.get('sort');
    if (sort) {
      addFilter({
        key: 'sort',
        value: sort,
        label: t('filterSort', { value: sortLabels[sort] || sort }),
      });
    }

    return filters;
  }, [allTags, categories, pathname, searchParams, searchParamsString, sortLabels, t]);

  const hasUserFilters = activeFilters.length > 0;

  const hasActiveFilters = useMemo(() => {
    if (fixedSearchParams && Object.keys(fixedSearchParams).length > 0) {
      return true;
    }

    const keys = Array.from(searchParams.keys());
    return keys.some((key) => key !== 'page');
  }, [fixedSearchParams, searchParams]);

  const [showDiscovery, setShowDiscovery] = useState(!hasActiveFilters);

  useEffect(() => {
    if (hasActiveFilters) {
      setShowDiscovery(false);
    }
  }, [hasActiveFilters]);

  const showLandingHero = isHomeLanding && !hasActiveFilters;
  const toolCountLabel = formatCount(stats?.toolCount, locale);
  const categoryCountLabel = formatCount(stats?.categoryCount ?? categories?.length, locale);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Landing hero — value prop + CTAs (search lives in sticky toolbar once) */}
      {showLandingHero ? (
        <section
          aria-labelledby="tools-page-title"
          className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8 lg:p-10"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
              <WandSparkles aria-hidden="true" className="h-4 w-4 animate-pulse" />
              {t('heroChip')}
            </div>

            <h1
              id="tools-page-title"
              className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              {pageTitle}
            </h1>
            <p
              id="tools-page-description"
              className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              {pageDescription}
            </p>

            {(toolCountLabel || categoryCountLabel) && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {toolCountLabel ? (
                  <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
                    {t('statsTools', { count: toolCountLabel })}
                  </span>
                ) : null}
                {categoryCountLabel ? (
                  <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
                    {t('statsCategories', { count: categoryCountLabel })}
                  </span>
                ) : null}
              </div>
            )}

            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="ai-tavsiye-gradient min-h-12 rounded-2xl px-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <Link
                  href="/tavsiye"
                  prefetch={false}
                  onClick={() =>
                    trackEvent('recommendation_cta_click', {
                      source: 'homepage_hero',
                    })
                  }
                  className="font-semibold"
                >
                  <Sparkles className="mr-2 h-5 w-5" aria-hidden="true" />
                  {t('aiRecommend')}
                  <ArrowRight aria-hidden="true" className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="glass-button min-h-12 rounded-2xl px-6"
              >
                <Link href="/kategori" prefetch={false} className="font-semibold">
                  <LayoutGrid className="mr-2 h-5 w-5" aria-hidden="true" />
                  {t('allCategories')}
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative z-10 mt-8 border-t border-border/50 pt-6">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('popularGoals')}
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {quickStartDefs.map(({ href, labelKey, icon: Icon }) => {
                const label = t(labelKey);
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    onClick={() =>
                      trackEvent('quick_start_click', {
                        destination: href,
                        label,
                      })
                    }
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border/50 bg-background/50 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Sticky toolbar — single search instance + filters */}
      <div
        className="sticky top-16 z-40 border-b px-3 py-2.5 text-center sm:px-4
             bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        {customHeader ? <div className="mb-3">{customHeader}</div> : null}

        {!customHeader && !showLandingHero ? (
          <>
            <h1
              id="tools-page-title"
              className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg"
            >
              {pageTitle}
            </h1>
            <p id="tools-page-description" className="sr-only">
              {pageDescription}
            </p>
          </>
        ) : null}

        <div
          className={`grid grid-cols-2 items-center justify-center gap-2 sm:flex sm:gap-2 ${
            !customHeader && !showLandingHero ? 'mt-1.5 sm:mt-2' : ''
          } ${showLandingHero ? 'mx-auto max-w-3xl' : ''}`}
        >
          <div className="col-span-2 sm:col-span-1 sm:min-w-0 sm:max-w-xl sm:flex-1">
            <SearchInput key={searchParams.get('search') || 'empty-search'} />
          </div>
          <FilterSheet
            categories={categories}
            allTags={allTags}
            fixedSearchParams={fixedSearchParams}
          />
          {discoverySections ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiscovery(!showDiscovery)}
              className="brand-gradient h-10 w-full min-h-10 px-3 text-xs shadow-md sm:h-10 sm:w-auto sm:text-sm"
            >
              {showDiscovery ? (
                <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              )}
              {showDiscovery ? t('toggleDiscoveryHide') : t('toggleDiscoveryShow')}
            </Button>
          ) : null}
        </div>
      </div>

      {hasUserFilters && (
        <section
          className="rounded-xl border bg-muted/35 px-4 py-3"
          aria-labelledby="active-filters-heading"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="active-filters-heading" className="text-sm font-semibold">
                {t('activeFiltersHeading', { count: activeFilters.length })}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('activeFiltersHint')}</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="self-start sm:self-auto">
              <Link href={pathname} scroll={false}>
                {t('clearAll')}
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
                aria-label={t('removeFilter', { label: filter.label })}
                onClick={() =>
                  trackEvent('active_filter_remove', {
                    filter_type: filter.id.split('-')[0],
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

      {showDiscovery && discoverySections ? (
        <div
          key="homepage-discovery"
          className="animate-in fade-in slide-in-from-top-4 duration-300"
        >
          {discoverySections}
          <div key="discovery-divider" className="mt-10 w-full border-t border-dashed sm:mt-12" />
        </div>
      ) : null}

      <section
        className="mt-8 sm:mt-10"
        aria-labelledby={
          showLandingHero || isHomeLanding ? 'all-tools-heading' : 'tools-page-title'
        }
      >
        {isHomeLanding ? (
          <div className="mb-5 sm:mb-6">
            <h2
              id="all-tools-heading"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {hasUserFilters ? t('filteredToolsHeading') : t('allToolsHeading')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasUserFilters ? t('filteredToolsSubheading') : t('allToolsSubheading')}
            </p>
          </div>
        ) : null}

        <Suspense key={searchParams.toString()} fallback={<ToolsGridSkeleton />}>
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

      <section className="mt-14 border-t pt-10 sm:mt-20 sm:pt-14">
        <NewsletterSignup />
      </section>
    </div>
  );
}
