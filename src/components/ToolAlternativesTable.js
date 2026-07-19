import logger from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { GitCompareArrows, Star, Table2 } from 'lucide-react';

import ToolIcon from '@/components/ToolIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatPricing } from '@/utils/formatPricing';

function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

async function getAlternatives(currentTool) {
  const supabase = createPublicClient();
  // Note: tools_with_ratings view currently does not expose name_en / description_en.
  // Use base name/description until the view is refreshed to include translation columns.
  const select =
    'id, name, slug, pricing_model, platforms, average_rating, total_ratings, link, tier, category_slug, category_name';

  let query = supabase
    .from('tools_with_ratings')
    .select(select)
    .eq('is_approved', true)
    .neq('id', currentTool.id)
    .order('total_ratings', { ascending: false })
    .limit(4);

  if (currentTool.category_slug) {
    query = query.eq('category_slug', currentTool.category_slug);
  } else if (currentTool.category_name) {
    query = query.eq('category_name', currentTool.category_name);
  }

  let { data, error } = await query;

  if (error || !data?.length) {
    const fallback = await supabase
      .from('tools_with_ratings')
      .select(select)
      .eq('is_approved', true)
      .neq('id', currentTool.id)
      .order('total_ratings', { ascending: false })
      .limit(4);

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    logger.error('Alternatif araçlar çekilirken hata:', error);
    return [];
  }

  return data || [];
}

function formatRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(1);
}

function platformsLabel(platforms) {
  if (!Array.isArray(platforms) || platforms.length === 0) return 'Web';
  if (platforms.length <= 2) return platforms.join(', ');
  return `${platforms.slice(0, 2).join(', ')} +${platforms.length - 2}`;
}

/**
 * Side-by-side alternatives table for the current tool vs same-category peers.
 */
export async function ToolAlternativesTable({ currentTool }) {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'ToolDetail' });
  const tPricing = await getTranslations({ locale, namespace: 'Pricing' });
  const useEn = locale === 'en';

  const alternatives = await getAlternatives(currentTool);
  if (alternatives.length === 0) return null;

  const currentRow = {
    id: currentTool.id,
    slug: currentTool.slug,
    name: currentTool.displayName || currentTool.name,
    link: currentTool.link,
    pricing: formatPricing(currentTool.pricing_model, tPricing) || t('pricingUnknown'),
    platforms: platformsLabel(currentTool.platforms),
    rating: formatRating(currentTool.average_rating),
    votes: Number(currentTool.total_ratings) || 0,
    tier: currentTool.tier || null,
    isCurrent: true,
  };

  const altRows = alternatives.map((tool) => ({
    id: tool.id,
    slug: tool.slug,
    name: useEn && tool.name_en ? tool.name_en : tool.name,
    link: tool.link,
    pricing: formatPricing(tool.pricing_model, tPricing) || t('pricingUnknown'),
    platforms: platformsLabel(tool.platforms),
    rating: formatRating(tool.average_rating),
    votes: Number(tool.total_ratings) || 0,
    tier: tool.tier || null,
    isCurrent: false,
  }));

  const rows = [currentRow, ...altRows];
  const compareSlugs = [currentTool.slug, ...altRows.map((r) => r.slug)].slice(0, 4);
  const multiCompareHref = `/karsilastir?tools=${compareSlugs.map(encodeURIComponent).join(',')}`;

  return (
    <section
      id="tool-alternatives"
      className="scroll-mt-36 sm:scroll-mt-40"
      aria-labelledby="tool-alternatives-heading"
    >
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="tool-alternatives-heading"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight"
          >
            <Table2 className="h-6 w-6 text-primary" aria-hidden="true" />
            {t('alternativesHeading')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('alternativesSubheading')}</p>
        </div>
        <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
          <Link href={multiCompareHref} prefetch={false}>
            <GitCompareArrows className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t('compareAll')}
          </Link>
        </Button>
      </div>

      <Card className="glass-panel overflow-hidden border-border/50">
        <CardContent className="p-0">
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">{t('alternativesHeading')}</caption>
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t('altColTool')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t('altColRating')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t('altColPricing')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t('altColPlatforms')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t('altColActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.isCurrent
                        ? 'border-b bg-primary/5 last:border-0'
                        : 'border-b last:border-0 hover:bg-muted/30'
                    }
                  >
                    <th scope="row" className="px-4 py-3.5 text-left font-medium">
                      <div className="flex items-center gap-2.5">
                        <ToolIcon name={row.name} link={row.link} className="h-8 w-8 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {row.isCurrent ? (
                              <span className="truncate font-semibold">{row.name}</span>
                            ) : (
                              <Link
                                href={`/tool/${row.slug}`}
                                prefetch={false}
                                className="truncate font-semibold hover:text-primary hover:underline"
                              >
                                {row.name}
                              </Link>
                            )}
                            {row.isCurrent ? (
                              <Badge className="brand-gradient border-0 text-[10px]">
                                {t('altCurrent')}
                              </Badge>
                            ) : null}
                            {row.tier && row.tier !== 'Free' ? (
                              <Badge variant="outline" className="text-[10px]">
                                {row.tier}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </th>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {row.rating ? (
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Star
                            className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                            aria-hidden="true"
                          />
                          {row.rating}
                          {row.votes > 0 ? (
                            <span className="font-normal text-muted-foreground">({row.votes})</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{t('noRatings')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">{row.pricing}</td>
                    <td className="max-w-[10rem] truncate px-4 py-3.5 text-muted-foreground">
                      {row.platforms}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {!row.isCurrent ? (
                          <Button asChild variant="outline" size="sm" className="h-8">
                            <Link href={`/tool/${row.slug}`} prefetch={false}>
                              {t('viewDetails')}
                            </Link>
                          </Button>
                        ) : null}
                        <Button asChild variant="ghost" size="sm" className="h-8">
                          <Link
                            href={`/karsilastir?tools=${encodeURIComponent(currentTool.slug)},${encodeURIComponent(row.slug)}`}
                            prefetch={false}
                          >
                            <GitCompareArrows className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            {t('compare')}
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="divide-y md:hidden">
            {rows.map((row) => (
              <div key={row.id} className={`space-y-3 p-4 ${row.isCurrent ? 'bg-primary/5' : ''}`}>
                <div className="flex items-start gap-3">
                  <ToolIcon name={row.name} link={row.link} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.isCurrent ? (
                        <p className="font-semibold">{row.name}</p>
                      ) : (
                        <Link
                          href={`/tool/${row.slug}`}
                          prefetch={false}
                          className="font-semibold hover:text-primary hover:underline"
                        >
                          {row.name}
                        </Link>
                      )}
                      {row.isCurrent ? (
                        <Badge className="brand-gradient border-0 text-[10px]">
                          {t('altCurrent')}
                        </Badge>
                      ) : null}
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      <div>
                        <dt className="text-muted-foreground">{t('altColRating')}</dt>
                        <dd className="font-medium">
                          {row.rating ? `★ ${row.rating}` : t('noRatings')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t('altColPricing')}</dt>
                        <dd className="font-medium">{row.pricing}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">{t('altColPlatforms')}</dt>
                        <dd className="font-medium">{row.platforms}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!row.isCurrent ? (
                        <Button asChild variant="outline" size="sm" className="h-9">
                          <Link href={`/tool/${row.slug}`} prefetch={false}>
                            {t('viewDetails')}
                          </Link>
                        </Button>
                      ) : null}
                      <Button asChild variant="secondary" size="sm" className="h-9">
                        <Link
                          href={`/karsilastir?tools=${encodeURIComponent(currentTool.slug)},${encodeURIComponent(row.slug)}`}
                          prefetch={false}
                        >
                          <GitCompareArrows className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          {t('compare')}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">{t('alternativesNote')}</p>
    </section>
  );
}
