import logger from '@/utils/logger';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ExternalLink, GitCompareArrows, Star, Table2 } from 'lucide-react';

import { AiComparison } from '@/components/AiComparison';
import { ToolSelectForComparison } from '@/components/ToolSelectForComparison';
import ToolIcon from '@/components/ToolIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrackedExternalLink } from '@/components/TrackedExternalLink';
import { formatPricing } from '@/utils/formatPricing';
import { generatePageMetadata } from '@/utils/seo';
import { requireProAccess } from '@/lib/proAccess';

const getSupabase = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

const getCachedComparisonData = unstable_cache(
  async (toolSlugs) => {
    if (!toolSlugs || toolSlugs.length === 0) {
      return [];
    }
    const supabase = getSupabase();
    // tools_with_ratings view currently lacks name_en / description_en columns.
    // Fall back to name/description until view is updated.
    const { data, error } = await supabase
      .from('tools_with_ratings')
      .select(
        'id, name, slug, description, link, category_name, category_slug, pricing_model, platforms, tier, average_rating, total_ratings, tags'
      )
      .in('slug', toolSlugs)
      .eq('is_approved', true);

    if (error) {
      logger.error('Karşılaştırma verisi çekilirken hata:', error);
      return [];
    }
    return toolSlugs.map((slug) => data.find((tool) => tool.slug === slug)).filter(Boolean);
  },
  ['comparison-data-cache-v3'],
  { revalidate: 3600 }
);

const getCachedAllToolsForSelect = unstable_cache(
  async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('tools')
      .select('name, slug')
      .eq('is_approved', true)
      .order('name');

    if (error) {
      logger.error('Tüm araçlar çekilirken hata:', error);
      return [];
    }
    return data || [];
  },
  ['all-tools-select-cache'],
  { revalidate: 3600 }
);

function parseToolSlugs(searchParams) {
  const raw = searchParams?.tools;
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function localizeTool(tool, locale) {
  if (!tool) return tool;
  const useEn = locale === 'en';
  return {
    ...tool,
    displayName: useEn && tool.name_en ? tool.name_en : tool.name,
    displayDescription: useEn && tool.description_en ? tool.description_en : tool.description,
  };
}

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => {
        if (typeof tag === 'string') return { id: tag, name: tag };
        if (tag && tag.name) return { id: tag.id || tag.name, name: tag.name };
        return null;
      })
      .filter(Boolean);
  }
  return [];
}

function formatRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(1);
}

export async function generateMetadata(props) {
  const { params, searchParams } = props;
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const t = await getTranslations({ locale, namespace: 'Compare' });
  const toolSlugs = parseToolSlugs(resolvedSearchParams);
  const path = locale === 'en' ? '/en/karsilastir' : '/karsilastir';

  if (toolSlugs.length > 0) {
    const tools = (await getCachedComparisonData(toolSlugs)).map((tool) =>
      localizeTool(tool, locale)
    );
    if (tools.length > 0) {
      const names = tools.map((tool) => tool.displayName).join(' vs ');
      return generatePageMetadata({
        title: t('metaTitleNamed', { names }),
        description: t('metaDescriptionNamed', { names }),
        path: `${path}?tools=${toolSlugs.join(',')}`,
      });
    }
  }

  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path,
  });
}

export default async function ComparePage(props) {
  const { params, searchParams } = props;
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const t = await getTranslations({ locale, namespace: 'Compare' });
  const tPricing = await getTranslations({ locale, namespace: 'Pricing' });

  const toolSlugs = parseToolSlugs(resolvedSearchParams);
  const [rawCompared, allTools] = await Promise.all([
    getCachedComparisonData(toolSlugs),
    getCachedAllToolsForSelect(),
  ]);

  const comparedTools = rawCompared.map((tool) => localizeTool(tool, locale));

  if (comparedTools.some((tool) => tool.tier === 'Pro')) {
    await requireProAccess({
      loginMessage: t('proLoginRequired'),
      proMessage: t('proAccessRequired'),
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-10 sm:space-y-12">
      {/* Hero */}
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Selector */}
      <section className="space-y-3">
        <ToolSelectForComparison allTools={allTools} selectedSlugs={toolSlugs} />
        {comparedTools.length > 0 ? (
          <p className="text-center text-xs text-muted-foreground">{t('shareHint')}</p>
        ) : null}
      </section>

      {/* Empty / need one more */}
      {comparedTools.length === 0 ? (
        <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <GitCompareArrows
            className="mx-auto h-10 w-10 text-muted-foreground/50"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-xl font-bold tracking-tight">{t('emptyTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {t('emptyBody')}
          </p>
        </section>
      ) : null}

      {comparedTools.length === 1 ? (
        <p className="text-center text-sm text-amber-700 dark:text-amber-300">{t('needOneMore')}</p>
      ) : null}

      {/* AI analysis */}
      {comparedTools.length > 1 ? (
        <section>
          <AiComparison tools={comparedTools} />
        </section>
      ) : null}

      {/* Matrix table */}
      {comparedTools.length > 0 ? (
        <section aria-labelledby="compare-matrix-heading" className="space-y-4">
          <div>
            <h2
              id="compare-matrix-heading"
              className="flex items-center gap-2 text-2xl font-bold tracking-tight"
            >
              <Table2 className="h-6 w-6 text-primary" aria-hidden="true" />
              {t('matrixHeading')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('matrixSubheading')}</p>
          </div>

          <Card className="glass-panel overflow-hidden border-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <caption className="sr-only">{t('matrixHeading')}</caption>
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th
                        scope="col"
                        className="sticky left-0 z-10 bg-muted/95 px-3 py-3 text-left font-semibold backdrop-blur sm:px-4"
                      >
                        {/* feature column */}
                      </th>
                      {comparedTools.map((tool) => (
                        <th
                          key={tool.id}
                          scope="col"
                          className="min-w-[140px] px-3 py-3 text-left font-semibold sm:min-w-[160px] sm:px-4"
                        >
                          <div className="flex items-center gap-2">
                            <ToolIcon
                              name={tool.displayName}
                              link={tool.link}
                              className="h-8 w-8 shrink-0"
                            />
                            <Link
                              href={`/tool/${tool.slug}`}
                              prefetch={false}
                              className="line-clamp-2 hover:text-primary hover:underline"
                            >
                              {tool.displayName}
                            </Link>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <MatrixRow label={t('rowRating')}>
                      {comparedTools.map((tool) => {
                        const rating = formatRating(tool.average_rating);
                        return (
                          <td key={tool.id} className="px-3 py-3 sm:px-4">
                            {rating ? (
                              <span className="inline-flex items-center gap-1 font-semibold">
                                <Star
                                  className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                                  aria-hidden="true"
                                />
                                {rating}
                                <span className="font-normal text-muted-foreground">
                                  ({t('votes', { count: tool.total_ratings || 0 })})
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{t('noRatings')}</span>
                            )}
                          </td>
                        );
                      })}
                    </MatrixRow>
                    <MatrixRow label={t('rowCategory')}>
                      {comparedTools.map((tool) => (
                        <td key={tool.id} className="px-3 py-3 sm:px-4">
                          {tool.category_slug ? (
                            <Link
                              href={`/kategori/${tool.category_slug}`}
                              prefetch={false}
                              className="hover:text-primary hover:underline"
                            >
                              {tool.category_name}
                            </Link>
                          ) : (
                            tool.category_name || '—'
                          )}
                        </td>
                      ))}
                    </MatrixRow>
                    <MatrixRow label={t('rowPricing')}>
                      {comparedTools.map((tool) => (
                        <td key={tool.id} className="px-3 py-3 sm:px-4">
                          {formatPricing(tool.pricing_model, tPricing) || t('pricingUnknown')}
                        </td>
                      ))}
                    </MatrixRow>
                    <MatrixRow label={t('rowPlatforms')}>
                      {comparedTools.map((tool) => (
                        <td key={tool.id} className="px-3 py-3 sm:px-4">
                          <div className="flex flex-wrap gap-1">
                            {(tool.platforms?.length ? tool.platforms : ['Web']).map((p) => (
                              <Badge key={p} variant="outline" className="text-[10px]">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      ))}
                    </MatrixRow>
                    <MatrixRow label={t('rowTier')}>
                      {comparedTools.map((tool) => (
                        <td key={tool.id} className="px-3 py-3 sm:px-4">
                          {tool.tier || '—'}
                        </td>
                      ))}
                    </MatrixRow>
                    <MatrixRow label={t('rowTags')} last>
                      {comparedTools.map((tool) => {
                        const tags = normalizeTags(tool.tags);
                        return (
                          <td key={tool.id} className="px-3 py-3 sm:px-4">
                            {tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {tags.slice(0, 4).map((tag) => (
                                  <Badge key={tag.id} variant="secondary" className="text-[10px]">
                                    {tag.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        );
                      })}
                    </MatrixRow>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* Detail cards */}
      {comparedTools.length > 0 ? (
        <section aria-labelledby="compare-cards-heading" className="space-y-4">
          <h2 id="compare-cards-heading" className="text-2xl font-bold tracking-tight">
            {t('cardsHeading')}
          </h2>
          <div
            className="grid gap-4 sm:gap-6"
            style={{
              gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 240px), 1fr))`,
            }}
          >
            {comparedTools.map((tool) => {
              const rating = formatRating(tool.average_rating);
              const tags = normalizeTags(tool.tags);
              return (
                <Card
                  key={tool.id}
                  className="glass-panel h-full border-border/50 transition-shadow hover:shadow-md"
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-start gap-3">
                      <ToolIcon
                        name={tool.displayName}
                        link={tool.link}
                        className="h-11 w-11 shrink-0"
                      />
                      <div className="min-w-0">
                        <CardTitle className="text-xl leading-snug">
                          <Link
                            href={`/tool/${tool.slug}`}
                            prefetch={false}
                            className="hover:text-primary hover:underline"
                          >
                            {tool.displayName}
                          </Link>
                        </CardTitle>
                        <CardDescription>{tool.category_name}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {rating ? (
                        <>
                          <Star
                            className="h-4 w-4 fill-amber-400 text-amber-400"
                            aria-hidden="true"
                          />
                          <span className="font-bold">{rating}</span>
                          <span className="text-muted-foreground">
                            ({t('votes', { count: tool.total_ratings || 0 })})
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{t('noRatings')}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
                      {tool.displayDescription || ''}
                    </p>

                    <div className="border-t border-border/50 pt-3">
                      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('rowPricing')}
                      </h3>
                      <p className="text-sm font-medium">
                        {formatPricing(tool.pricing_model, tPricing) || t('pricingUnknown')}
                      </p>
                    </div>

                    <div className="border-t border-border/50 pt-3">
                      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('rowPlatforms')}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {(tool.platforms?.length ? tool.platforms : ['Web']).map((p) => (
                          <Badge key={p} variant="outline">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {tags.length > 0 ? (
                      <div className="border-t border-border/50 pt-3">
                        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t('rowTags')}
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.slice(0, 6).map((tag) => (
                            <Badge key={tag.id} variant="secondary">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
                      <Button asChild size="sm" variant="outline" className="min-h-9">
                        <Link href={`/tool/${tool.slug}`} prefetch={false}>
                          {t('viewDetails')}
                        </Link>
                      </Button>
                      {tool.link ? (
                        <Button asChild size="sm" className="brand-gradient min-h-9">
                          <TrackedExternalLink
                            href={tool.link}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            eventParameters={{
                              tool_slug: tool.slug,
                              placement: 'compare_card',
                            }}
                          >
                            {t('visitSite')}
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          </TrackedExternalLink>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MatrixRow({ label, children, last = false }) {
  return (
    <tr className={last ? '' : 'border-b border-border/50'}>
      <th
        scope="row"
        className="sticky left-0 z-10 bg-background/95 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur sm:px-4 sm:text-sm sm:normal-case sm:tracking-normal"
      >
        {label}
      </th>
      {children}
    </tr>
  );
}
