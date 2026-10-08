import { getCategoryLabel } from '@/lib/categoryLocalization';
import logger from '@/utils/logger';
import { Link } from '@/i18n/routing';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  ExternalLink,
  MonitorSmartphone,
  Sparkles,
  Star,
  WalletCards,
} from 'lucide-react';
import ToolIcon from '@/components/ToolIcon';
import { TrackedExternalLink } from '@/components/TrackedExternalLink';
import { getTranslations } from 'next-intl/server';
import { formatPricing } from '@/utils/formatPricing';

async function getFeaturedTools() {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('tools_with_ratings')
    .select(
      'id, name, slug, description, link, tier, category_name, category_slug, pricing_model, platforms, average_rating, total_ratings'
    )
    .eq('is_approved', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    logger.error('Öne çıkan araçlar çekilirken hata:', error);
    return [];
  }

  if (!data?.length) return [];

  const { data: localizedRows, error: localizedError } = await supabase
    .from('tools')
    .select('id, name_en, description_en, link_check_status')
    .in(
      'id',
      data.map((tool) => tool.id)
    );

  if (localizedError) {
    logger.warn('Öne çıkan araçların yerelleştirilmiş alanları alınamadı:', localizedError);
    return data;
  }

  const localizedById = new Map((localizedRows || []).map((row) => [row.id, row]));
  return data.map((tool) => ({ ...tool, ...localizedById.get(tool.id) }));
}

function localizeTool(tool, locale) {
  const useEnglish = locale === 'en';
  return {
    ...tool,
    displayName: useEnglish && tool.name_en ? tool.name_en : tool.name,
    displayDescription: useEnglish && tool.description_en ? tool.description_en : tool.description,
  };
}

export async function FeaturedTools({ locale = 'tr' }) {
  const featuredTools = await getFeaturedTools();
  const t = await getTranslations({ locale, namespace: 'Discover' });
  const tPricing = await getTranslations({ locale, namespace: 'Pricing' });

  if (featuredTools.length === 0) return null;

  return (
    <section className="mb-4" aria-labelledby="featured-tools-heading">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {t('featuredEyebrow')}
          </div>
          <h2
            id="featured-tools-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {t('featuredHeading')}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('featuredSubheading')}</p>
        </div>
        <Link
          href="/?sort=rating"
          className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-primary transition-colors hover:text-primary/80 sm:self-auto"
        >
          {t('viewAllTools')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featuredTools.map((rawTool, index) => {
          const tool = localizeTool(rawTool, locale);
          const rating = Number(tool.average_rating) || 0;
          const platforms = Array.isArray(tool.platforms) ? tool.platforms : [];
          const pricing = formatPricing(tool.pricing_model, tPricing) || t('pricingUnknown');

          return (
            <Card
              key={tool.id ?? tool.slug ?? `featured-${index}`}
              className="group relative h-full overflow-hidden border border-indigo-500/20 bg-slate-950 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/50 hover:shadow-[0_18px_50px_-24px_rgba(99,102,241,0.85)] focus-within:ring-2 focus-within:ring-indigo-400/50"
            >
              {/* Aurora / cam efekt katmanları */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-slate-950 to-purple-900/40" />
              <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-indigo-600/30 blur-3xl transition-all duration-500 group-hover:bg-indigo-500/40" />
              <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-purple-600/30 blur-3xl transition-all duration-500 group-hover:bg-purple-500/40" />

              <CardContent className="relative z-10 flex h-full min-h-[350px] flex-col p-5 sm:p-6">
                <div>
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      {t('featuredBadge')}
                    </Badge>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <Link href={`/tool/${tool.slug}`} prefetch={false} className="group/title block">
                    <h3 className="flex items-center gap-3 text-xl font-bold tracking-tight sm:text-2xl">
                      <ToolIcon
                        name={tool.displayName}
                        link={tool.link}
                        className="h-11 w-11 rounded-xl border-white/25 bg-white/10 p-1.5 shadow-sm"
                      />
                      <span className="transition-colors group-hover/title:text-indigo-200">
                        {tool.displayName}
                      </span>
                    </h3>
                  </Link>
                  <p className="mt-4 line-clamp-3 min-h-[66px] text-sm leading-6 text-white/75">
                    {tool.displayDescription}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 border-y border-white/10 py-3">
                  <div className="min-w-0">
                    <span className="flex items-center gap-1 text-[11px] text-white/50">
                      <Star className="h-3 w-3" aria-hidden="true" />
                      {t('ratingShort')}
                    </span>
                    <p className="mt-1 truncate text-xs font-semibold text-white">
                      {rating > 0 ? rating.toFixed(1) : t('newTool')}
                    </p>
                  </div>
                  <div className="min-w-0 border-x border-white/10 px-2">
                    <span className="flex items-center gap-1 text-[11px] text-white/50">
                      <WalletCards className="h-3 w-3" aria-hidden="true" />
                      {t('pricingShort')}
                    </span>
                    <p className="mt-1 truncate text-xs font-semibold text-white">{pricing}</p>
                  </div>
                  <div className="min-w-0 pl-1">
                    <span className="flex items-center gap-1 text-[11px] text-white/50">
                      <MonitorSmartphone className="h-3 w-3" aria-hidden="true" />
                      {t('platformShort')}
                    </span>
                    <p className="mt-1 truncate text-xs font-semibold text-white">
                      {platforms[0] || 'Web'}
                      {platforms.length > 1 ? ` +${platforms.length - 1}` : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <Link
                    href={`/kategori/${tool.category_slug}`}
                    prefetch={false}
                    className="max-w-[45%] truncate rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {getCategoryLabel(tool, locale)}
                  </Link>
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/10 hover:text-white"
                    >
                      <Link href={`/tool/${tool.slug}`} prefetch={false}>
                        {t('viewDetails')}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </Button>
                    {tool.link ? (
                      <Button
                        asChild
                        size="icon"
                        variant="secondary"
                        className="h-9 w-9 shrink-0 bg-white text-slate-950 hover:bg-white/90"
                      >
                        <TrackedExternalLink
                          href={tool.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          eventName="official_site_click"
                          eventParameters={{
                            source: 'featured_tools',
                            tool_slug: tool.slug,
                            category: tool.category_slug,
                          }}
                          aria-label={t('visitNamed', { name: tool.displayName })}
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </TrackedExternalLink>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
