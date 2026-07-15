'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { usePathname, useSearchParams } from 'next/navigation';
import { fetchMoreTools } from '@/app/actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ToolIcon from '@/components/ToolIcon';
import {
  ArrowRight,
  Star,
  Crown,
  Gem,
  Globe,
  Apple,
  Bot,
  Monitor,
  Pen,
  ShoppingCart,
  Eye,
  SearchX,
  WandSparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolCardSkeleton } from './ToolCardSkeleton';
import { trackEvent } from '@/utils/analytics';
// import { ToolPreviewDialog } from './ToolPreviewDialog';

const tierStyles = {
  Pro: {
    badge: 'bg-purple-600 text-white hover:bg-purple-700',
    icon: <Crown className="w-4 h-4 mr-1.5" />,
  },
  Sponsorlu: {
    badge: 'bg-amber-500 text-white hover:bg-amber-600',
    icon: <Gem className="w-4 h-4 mr-1.5" />,
  },
  default: {
    badge: 'bg-blue-900 text-white hover:bg-blue-800',
    icon: null, // default araçlarda ikon yok
  },
};

const platformIcons = {
  Web: <Globe className="w-4 h-4" />,
  iOS: <Apple className="w-4 h-4" />,
  Android: <Bot className="w-4 h-4" />,
  Windows: <Monitor className="w-4 h-4" />,
  macOS: <Monitor className="w-4 h-4" />,
  Linux: <Pen className="w-4 h-4" />,
  'Chrome Uzantısı': <ShoppingCart className="w-4 h-4" />,
};

function getPopularityScore(tool) {
  const score = Number(tool?.popularity_score);
  return Number.isFinite(score) ? score : 0;
}

// -----------------------------
// Tek bir araç kartı (DÜZELTİLMİŞ HALİ)
// -----------------------------
export default function ToolCard({ tool }) {
  // router'a artık burada ihtiyacımız yok.
  // const router = useRouter();
  if (!tool || !tool.name) return null;

  const isPremium = tool.tier === 'Pro' || tool.tier === 'Sponsorlu';

  // DEĞİŞİKLİK 1: Ana sarmalayıcıyı <div onClick> yerine <Link> yapın.
  return (
    <article
      className={cn(
        'relative block overflow-hidden rounded-xl border p-4 shadow-md transition-all duration-300 sm:p-6 md:hover:-translate-y-2 md:hover:shadow-xl',
        {
          'border-purple-400/40 shadow-purple-400/20 hover:shadow-purple-500/40 bg-card':
            tool.tier === 'Pro',
          'border-amber-400/40 shadow-amber-400/20 hover:shadow-amber-500/40 bg-card':
            tool.tier === 'Sponsorlu',
          'bg-card': tool.tier === 'default' || !tool.tier,
        }
      )}
    >
      <div className="flex flex-col h-full">
        {/* Premium Badge */}
        {isPremium && (
          <Badge
            className={`mb-2 flex w-fit items-center px-3 py-1 rounded-full ${tierStyles[tool.tier]?.badge || 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'}`}
          >
            {tierStyles[tool.tier]?.icon || <Star className="w-4 h-4 mr-1.5" />} {tool.tier}
          </Badge>
        )}

        {/* Araç Adı */}
        <h2 className="text-lg font-bold leading-tight sm:text-xl">
          <Link
            href={`/tool/${tool.slug}`}
            prefetch={false}
            onClick={() =>
              trackEvent('tool_detail_click', {
                tool_slug: tool.slug,
                source: 'tool_card_title',
                category: tool.category_slug,
              })
            }
            className="flex items-center gap-2 rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ToolIcon name={tool.name} link={tool.link} />
            {tool.name}
          </Link>
        </h2>

        {/* Kategori */}
        <div className="my-2">
          {/* DEĞİŞİKLİK 2: İçteki Link'e tıklamanın dış Link'i tetiklemesini engellemek için stopPropagation ekleyin. */}
          <Link
            href={`/kategori/${tool.category_slug}`}
            prefetch={false}
            className="inline-block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground w-fit hover:bg-primary hover:text-primary-foreground transition-colors">
              {tool.category_name}
            </span>
          </Link>
        </div>

        {/* Etiketler */}
        {tool.tags && tool.tags.length > 0 && (
          <div className="my-2 flex flex-wrap gap-1 sm:my-3">
            {tool.tags.slice(0, 3).map((tag, tagIndex) => (
              // DEĞİŞİKLİK 3: Etiket Link'lerine de stopPropagation ekleyin.
              <Link
                key={tag.id ?? tag.slug ?? `tag-${tagIndex}`}
                href={`/?tags=${tag.id}`}
                prefetch={false}
                onClick={(e) => e.stopPropagation()}
              >
                <Badge
                  variant="outline"
                  className="hover:bg-accent hover:border-primary transition-colors"
                >
                  {tag.name}
                </Badge>
              </Link>
            ))}
            {tool.tags.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{tool.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Açıklama */}
        <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground sm:mt-4 sm:line-clamp-3 sm:min-h-[72px]">
          {tool.description}
        </p>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 sm:pt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            {/* platform ikonları */}
            {tool.platforms &&
              tool.platforms.slice(0, 3).map((platform) => (
                <span key={platform} title={platform} aria-label={platform}>
                  {platformIcons[platform] || <Eye className="w-4 h-4" />}
                </span>
              ))}
            {tool.platforms && tool.platforms.length > 3 && (
              <span className="text-xs">+{tool.platforms.length - 3}</span>
            )}
          </div>

          <Button
            asChild
            size="sm"
            className="h-8 shrink-0 px-3 text-xs transition-colors hover:bg-primary/80 sm:h-9 sm:text-sm"
          >
            <Link
              href={`/tool/${tool.slug}`}
              prefetch={false}
              onClick={() =>
                trackEvent('tool_detail_click', {
                  tool_slug: tool.slug,
                  source: 'tool_card_button',
                  category: tool.category_slug,
                })
              }
              className="px-2 py-1 sm:px-3"
            >
              Detayları İncele
              <ArrowRight aria-hidden="true" className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

// -----------------------------
// Sonsuz Kaydırma Listesi
// -----------------------------
export function InfiniteToolsList({
  initialTools,
  user,
  favoriteToolIds,
  fixedSearchParams,
  hasUserFilters,
}) {
  const [tools, setTools] = useState(initialTools || []);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialTools?.length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { ref, inView } = useInView({ threshold: 0.5 });
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const searchParamsString = searchParams.toString();
  const [previewTool, setPreviewTool] = useState(null);

  const loadMoreTools = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);

    const paramsAsObject = {
      ...Object.fromEntries(searchParams.entries()),
      ...fixedSearchParams,
    };

    try {
      const newTools = await fetchMoreTools({ page, searchParams: paramsAsObject });

      if (newTools?.length) {
        setPage((prev) => prev + 1);
        setTools((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const uniqueNewTools = newTools.filter((t) => !existingIds.has(t.id));
          const mergedTools = [...prev, ...uniqueNewTools];

          // Popülerliğe göre yeniden sırala
          return mergedTools.sort((a, b) => getPopularityScore(b) - getPopularityScore(a));
        });
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Daha fazla araç yüklenemedi:', error);
      // Pause auto-load; user can retry without an infinite error loop.
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [fixedSearchParams, page, searchParams]);

  useEffect(() => {
    if (inView && hasMore && !isLoading && !loadError) {
      loadMoreTools();
    }
  }, [inView, hasMore, isLoading, loadError, loadMoreTools]);

  useEffect(() => {
    setTools(initialTools || []);
    setPage(1);
    setHasMore(initialTools?.length > 0);
    setLoadError(false);
  }, [searchParamsString, initialTools]);

  return (
    <>
      {tools.length === 0 ? (
        <div
          role="status"
          className="rounded-2xl border border-dashed bg-muted/20 px-5 py-12 text-center sm:px-8 sm:py-16"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <SearchX aria-hidden="true" className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-tight">
            {hasUserFilters
              ? 'Bu ölçütlerle araç bulunamadı'
              : 'Henüz gösterilecek araç bulunmuyor'}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            {hasUserFilters
              ? 'Arama ifadesini kısaltmayı veya bazı filtreleri kaldırmayı deneyebilirsin.'
              : 'Araç listesi güncelleniyor. Biraz sonra tekrar kontrol edebilirsin.'}
          </p>

          {hasUserFilters && (
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link href={pathname} scroll={false}>
                  <X aria-hidden="true" className="mr-2 h-4 w-4" />
                  Arama ve filtreleri temizle
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  href="/tavsiye"
                  prefetch={false}
                  onClick={() =>
                    trackEvent('recommendation_cta_click', {
                      source: 'search_empty_state',
                    })
                  }
                >
                  <WandSparkles aria-hidden="true" className="mr-2 h-4 w-4" />
                  AI ile araç bul
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-8">
          {tools.map((tool, index) => (
            <ToolCard
              key={tool.id ?? tool.slug ?? `tool-${index}`}
              tool={tool}
              user={user}
              isFavorited={favoriteToolIds?.has?.(tool.id)}
              onPreviewClick={setPreviewTool}
            />
          ))}
        </div>
      )}

      {hasMore && !loadError && (
        <div ref={ref} className="col-span-full mt-8" role="status" aria-live="polite">
          <span className="sr-only">Daha fazla araç yükleniyor</span>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-8">
            <ToolCardSkeleton key="skeleton-1" />
            <ToolCardSkeleton key="skeleton-2" />
            <ToolCardSkeleton key="skeleton-3" />
          </div>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="col-span-full mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-5 py-8 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Daha fazla araç yüklenirken bir sorun oluştu.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLoadError(false);
              loadMoreTools();
            }}
            disabled={isLoading}
          >
            Tekrar dene
          </Button>
        </div>
      )}

      {/*{previewTool && (
        <ToolPreviewDialog
          tool={previewTool}
          isOpen={!!previewTool}
          onClose={() => setPreviewTool(null)} 
        /> 
      )}  */}
    </>
  );
}

// Ana Araç Listesi Bileşeni
// Bu bileşen artık bir Server Component değil, Client Component olmalı.
// Bu yüzden, veri çekme mantığını bir üst bileşene (page.js) taşımamız gerekecek.
// ToolsList
export function ToolsList({ tools = [], user, favoriteToolIds }) {
  const sortedTools = [...tools].sort((a, b) => getPopularityScore(b) - getPopularityScore(a));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {sortedTools.map((tool, index) => (
        <ToolCard
          key={tool.id ?? tool.slug ?? `tool-${index}`}
          tool={tool}
          user={user}
          isFavorited={
            favoriteToolIds instanceof Set
              ? favoriteToolIds.has(tool.id)
              : Array.isArray(favoriteToolIds)
                ? favoriteToolIds.includes(tool.id)
                : false
          }
        />
      ))}
    </div>
  );
}
// Artık veri çekme mantığını bu bileşene taşımıyoruz.
// Veri çekme işlemi, bu bileşeni kullanan üst bileşen tarafından yapılmalı.
// Bu bileşen sadece verilen "tools" verisini alıp görüntülemekle sorumlu.
