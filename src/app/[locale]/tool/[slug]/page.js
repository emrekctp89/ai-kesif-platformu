import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GitCompareArrows,
  Layers3,
  MonitorSmartphone,
  ShieldCheck,
  Star,
  WalletCards,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShareButtons } from '@/components/ShareButtons';
import { SimilarTools } from '@/components/SimilarTools';
import { TrackedExternalLink } from '@/components/TrackedExternalLink';
import { ToolLinkReportDialog } from '@/components/ToolLinkReportDialog';
import { ToolComments } from '@/components/ToolComments';
import { PromoteToolButton } from '@/components/PromoteToolButton';
import { ToolDetailActions } from '@/components/ToolDetailActions';
import { ToolDetailSectionNav } from '@/components/ToolDetailSectionNav';
import { ToolPromptsPanel } from '@/components/ToolPromptsPanel';
import { ToolAlternativesTable } from '@/components/ToolAlternativesTable';
import { ToolFaq, buildToolFaqItems } from '@/components/ToolFaq';
import ToolIcon from '@/components/ToolIcon';
import { getTranslations } from 'next-intl/server';
import { formatPricing } from '@/utils/formatPricing';
import { getSiteOrigin } from '@/utils/siteUrl';
import { requireProAccess } from '@/lib/proAccess';
import { getPublishedPostsForTool } from '@/lib/contentAuthors';

export const revalidate = 3600;

const siteUrl = getSiteOrigin();

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

async function getToolData(slug, categoryFallback) {
  const supabase = createPublicClient();
  const { data: tool, error } = await supabase
    .from('tools')
    .select(
      'id, name, name_en, description, description_en, link, category_id, slug, pricing_model, platforms, tier, is_featured, created_at, updated_at, technical_details, link_check_status, link_check_error, link_check_http_status, link_checked_at'
    )
    .eq('slug', slug)
    .eq('is_approved', true)
    .maybeSingle();

  if (error || !tool) return null;

  const [categoryResult, ratingResult, tagsResult] = await Promise.all([
    tool.category_id
      ? supabase.from('categories').select('name, slug').eq('id', tool.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('tools_with_ratings')
      .select('average_rating, total_ratings')
      .eq('id', tool.id)
      .maybeSingle(),
    supabase.from('tool_tags').select('tags(id, name)').eq('tool_id', tool.id),
  ]);

  const tags = (tagsResult.data || [])
    .map((row) => row.tags)
    .filter((tag) => tag && tag.id && tag.name);

  return {
    ...tool,
    category_name: categoryResult.data?.name || categoryFallback,
    category_slug: categoryResult.data?.slug,
    average_rating: Number(ratingResult.data?.average_rating) || 0,
    total_ratings: Number(ratingResult.data?.total_ratings) || 0,
    tags,
  };
}

function formatDate(value, locale) {
  if (!value) return null;

  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value, locale) {
  if (!value) return null;

  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(value));
}

function getLinkHealthMeta(tool, t, locale) {
  const status = String(tool.link_check_status || '').toLowerCase();
  const checkedAt = formatDateTime(tool.link_checked_at, locale);
  const checkedLabel = checkedAt ? t('lastChecked', { date: checkedAt }) : null;

  if (status === 'valid') {
    return {
      icon: ShieldCheck,
      title: t('linkValidTitle'),
      description: checkedLabel || t('linkValidDesc'),
      badge: t('linkValidBadge'),
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      iconClassName: 'text-emerald-600 dark:text-emerald-300',
    };
  }

  if (status === 'review') {
    return {
      icon: Clock3,
      title: t('linkReviewTitle'),
      description: tool.link_check_error || checkedLabel || t('linkReviewDesc'),
      badge: t('linkReviewBadge'),
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      iconClassName: 'text-amber-600 dark:text-amber-300',
    };
  }

  if (status === 'invalid') {
    return {
      icon: AlertTriangle,
      title: t('linkInvalidTitle'),
      description: tool.link_check_error || checkedLabel || t('linkInvalidDesc'),
      badge: t('linkInvalidBadge'),
      className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
      iconClassName: 'text-red-600 dark:text-red-300',
    };
  }

  return {
    icon: Clock3,
    title: t('linkPendingTitle'),
    description: t('linkPendingDesc'),
    badge: t('linkPendingBadge'),
    className: 'border-muted bg-muted/40 text-muted-foreground',
    iconClassName: 'text-muted-foreground',
  };
}

function createMetaDescription(description) {
  if (!description || description.length <= 160) return description;
  return `${description.slice(0, 157).trimEnd()}...`;
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

function formatRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(1);
}

export async function generateMetadata({ params }) {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ToolDetail' });
  const tool = localizeTool(await getToolData(slug, t('aiCategoryFallback')), locale);

  if (!tool) {
    return {
      title: t('notFoundTitle'),
      robots: { index: false, follow: false },
    };
  }

  const title = t('metaTitle', { name: tool.displayName });
  const description = createMetaDescription(tool.displayDescription);
  const pageUrl = `${siteUrl}/tool/${tool.slug}`;
  const ogImageUrl = `${siteUrl}/opengraph-image`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: pageUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${tool.displayName} - AI Keşif`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ToolPage(props) {
  const { params } = props;
  const { slug, locale } = await params;
  const tPricing = await getTranslations({ locale, namespace: 'Pricing' });
  const t = await getTranslations({ locale, namespace: 'ToolDetail' });
  const tool = localizeTool(await getToolData(slug, t('aiCategoryFallback')), locale);

  if (!tool) notFound();

  if (tool.tier === 'Pro') {
    await requireProAccess({
      loginMessage: t('proLoginRequired'),
      proMessage: t('proAccessRequired'),
    });
  }

  const shareUrl = `${siteUrl}/tool/${tool.slug}`;
  const linkHealth = getLinkHealthMeta(tool, t, locale);
  const LinkHealthIcon = linkHealth.icon;
  const addedDate = formatDate(tool.created_at, locale);
  const updatedDate = formatDate(tool.updated_at, locale);
  const platforms =
    Array.isArray(tool.platforms) && tool.platforms.length > 0 ? tool.platforms : ['Web'];
  const ratingDisplay = formatRating(tool.average_rating);
  const pricingLabel = formatPricing(tool.pricing_model, tPricing) || t('pricingUnknown');
  const compareHref = `/karsilastir?tools=${encodeURIComponent(tool.slug)}`;
  const faqItems = buildToolFaqItems({
    tool,
    t,
    tPricing,
    formatPricing,
    formatDate,
    locale,
    platforms,
    pricingLabel,
    linkHealthBadge: linkHealth.badge,
  });
  const relatedGuides = await getPublishedPostsForTool(createPublicClient(), tool.id, {
    limit: 4,
  });

  const sectionNavItems = [
    { id: 'tool-overview', label: t('overview'), navLabel: t('sectionNav') },
    ...(tool.technical_details
      ? [{ id: 'tool-technical', label: t('technicalDetails'), navLabel: t('sectionNav') }]
      : []),
    { id: 'tool-faq', label: t('faqHeading'), navLabel: t('sectionNav') },
    { id: 'tool-alternatives', label: t('alternativesHeading'), navLabel: t('sectionNav') },
    { id: 'tool-prompts', label: t('promptsHeading'), navLabel: t('sectionNav') },
    ...(relatedGuides.length
      ? [{ id: 'tool-guides', label: t('relatedGuidesHeading'), navLabel: t('sectionNav') }]
      : []),
    { id: 'similar-tools-heading', label: t('similarHeading'), navLabel: t('sectionNav') },
    { id: 'tool-comments-heading', label: t('commentsHeading'), navLabel: t('sectionNav') },
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${shareUrl}#software`,
        name: tool.displayName,
        description: tool.displayDescription,
        url: shareUrl,
        sameAs: tool.link,
        applicationCategory: tool.category_name,
        operatingSystem: platforms.join(', '),
        datePublished: tool.created_at || undefined,
        dateModified: tool.updated_at || tool.created_at || undefined,
        inLanguage: locale === 'en' ? 'en-US' : 'tr-TR',
        ...(ratingDisplay && tool.total_ratings > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: ratingDisplay,
                ratingCount: tool.total_ratings,
                bestRating: '5',
                worstRating: '1',
              },
            }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${shareUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t('home'),
            item: siteUrl,
          },
          ...(tool.category_slug
            ? [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: tool.category_name,
                  item: `${siteUrl}/kategori/${tool.category_slug}`,
                },
              ]
            : []),
          {
            '@type': 'ListItem',
            position: tool.category_slug ? 3 : 2,
            name: tool.displayName,
            item: shareUrl,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${shareUrl}#faq`,
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />

      <div className="mx-auto max-w-6xl px-3 pb-28 pt-5 sm:px-4 sm:py-10 lg:pb-10">
        {/* Breadcrumb + back */}
        <nav aria-label="Breadcrumb" className="mb-4 sm:mb-6">
          <ol className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">
                {t('home')}
              </Link>
            </li>
            {tool.category_slug ? (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    href={`/kategori/${tool.category_slug}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {tool.category_name}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden="true">/</li>
            <li className="truncate font-medium text-foreground" aria-current="page">
              {tool.displayName}
            </li>
          </ol>

          <Link
            href={tool.category_slug ? `/kategori/${tool.category_slug}` : '/'}
            className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:min-h-11"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {tool.category_slug
              ? t('backToCategory', { category: tool.category_name })
              : t('backToAll')}
          </Link>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <div className="min-w-0 space-y-6 sm:space-y-8">
            <ToolDetailSectionNav items={sectionNavItems} />

            {/* Hero */}
            <section className="brand-surface relative overflow-hidden rounded-3xl border p-4 shadow-sm glass-panel sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

              <div className="relative z-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                  <div className="shrink-0 rounded-2xl border border-border/50 bg-background p-3 shadow-md">
                    <ToolIcon
                      name={tool.displayName}
                      link={tool.link}
                      className="h-14 w-14 sm:h-16 sm:w-16"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {tool.category_slug ? (
                        <Link href={`/kategori/${tool.category_slug}`}>
                          <Badge variant="secondary" className="hover:bg-secondary/80">
                            {tool.category_name}
                          </Badge>
                        </Link>
                      ) : (
                        <Badge variant="secondary">{tool.category_name}</Badge>
                      )}
                      {tool.pricing_model ? (
                        <Badge variant="outline">
                          {formatPricing(tool.pricing_model, tPricing)}
                        </Badge>
                      ) : null}
                      {tool.is_featured ? (
                        <Badge className="brand-gradient border-0">{t('featured')}</Badge>
                      ) : null}
                      {tool.tier && tool.tier !== 'Free' ? (
                        <Badge variant="outline">{tool.tier}</Badge>
                      ) : null}
                      {platforms.slice(0, 2).map((platform) => (
                        <Badge key={platform} variant="outline">
                          {platform}
                        </Badge>
                      ))}
                    </div>

                    <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:mt-4 sm:text-4xl lg:text-5xl">
                      {tool.displayName}
                    </h1>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {ratingDisplay ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                          <Star
                            className="h-4 w-4 fill-amber-400 text-amber-400"
                            aria-hidden="true"
                          />
                          <span>{t('ratingLabel', { rating: ratingDisplay })}</span>
                          {tool.total_ratings > 0 ? (
                            <span className="font-normal text-muted-foreground">
                              · {t('ratingCount', { count: tool.total_ratings })}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span>{t('noRatings')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:mt-5 sm:text-lg sm:leading-8">
                  {tool.displayDescription}
                </p>

                {tool.tags?.length > 0 ? (
                  <div className="mt-4">
                    <p className="sr-only">{t('tags')}</p>
                    <div className="flex flex-wrap gap-2">
                      {tool.tags.map((tag) => (
                        <Link key={tag.id} href={`/?tags=${tag.id}`} prefetch={false}>
                          <Badge
                            variant="outline"
                            className="bg-background/50 transition-colors hover:border-primary hover:bg-primary/5"
                          >
                            #{tag.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-2 sm:mt-7 sm:flex-row sm:items-center sm:gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="brand-gradient min-h-12 shadow-md sm:min-w-56"
                  >
                    <TrackedExternalLink
                      href={tool.link}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      eventParameters={{
                        tool_slug: tool.slug,
                        category: tool.category_slug,
                        placement: 'hero',
                      }}
                    >
                      {t('visitOfficial')}
                      <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                    </TrackedExternalLink>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="glass-button min-h-12">
                    <Link href={compareHref} prefetch={false}>
                      <GitCompareArrows className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t('compare')}
                    </Link>
                  </Button>
                </div>

                <div className="mt-5 rounded-2xl border border-border/50 bg-background/60 p-4 backdrop-blur-sm">
                  <ToolDetailActions toolId={tool.id} toolSlug={tool.slug} />
                </div>

                <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <TrustNote text={t('trustPricing')} />
                  <TrustNote text={t('trustCompare')} />
                </div>
              </div>
            </section>

            {/* Overview */}
            <section
              id="tool-overview"
              className="scroll-mt-36 sm:scroll-mt-40"
              aria-labelledby="tool-overview-heading"
            >
              <h2 id="tool-overview-heading" className="mb-4 text-2xl font-bold tracking-tight">
                {t('overview')}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <InfoCard icon={Layers3} label={t('category')} value={tool.category_name} />
                <InfoCard icon={WalletCards} label={t('pricing')} value={pricingLabel} />
                <InfoCard
                  icon={MonitorSmartphone}
                  label={t('platforms')}
                  value={platforms.join(', ')}
                />
                <InfoCard
                  icon={CalendarDays}
                  label={updatedDate ? t('lastUpdated') : t('addedToPlatform')}
                  value={updatedDate || addedDate || t('recently')}
                />
                <InfoCard
                  icon={Star}
                  label={t('ratingOverview')}
                  value={
                    ratingDisplay
                      ? `${ratingDisplay}${tool.total_ratings > 0 ? ` · ${t('ratingCount', { count: tool.total_ratings })}` : ''}`
                      : t('noRatings')
                  }
                />
              </div>

              <Card className="glass-panel mt-4 border-border/50">
                <CardContent className="p-4 sm:p-5">
                  <p className="text-sm font-semibold text-foreground">{t('howToDecide')}</p>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {t('howToDecideBody')}
                  </p>
                </CardContent>
              </Card>
            </section>

            {tool.technical_details ? (
              <section
                id="tool-technical"
                className="scroll-mt-36 sm:scroll-mt-40"
                aria-labelledby="technical-details-heading"
              >
                <h2
                  id="technical-details-heading"
                  className="mb-4 text-2xl font-bold tracking-tight"
                >
                  {t('technicalDetails')}
                </h2>
                <Card className="glass-panel border-border/50">
                  <CardContent className="p-5 text-sm leading-7 text-muted-foreground sm:p-6">
                    {tool.technical_details}
                  </CardContent>
                </Card>
              </section>
            ) : null}

            <section className="border-t pt-8">
              <ToolFaq items={faqItems} heading={t('faqHeading')} subheading={t('faqSubheading')} />
            </section>

            <section className="border-t pt-8">
              <ToolAlternativesTable currentTool={tool} />
            </section>

            <section className="border-t pt-8">
              <ToolPromptsPanel toolId={tool.id} toolSlug={tool.slug} />
            </section>

            {relatedGuides.length > 0 ? (
              <section
                id="tool-guides"
                className="scroll-mt-36 border-t pt-8 sm:scroll-mt-40"
                aria-labelledby="tool-guides-heading"
              >
                <h2
                  id="tool-guides-heading"
                  className="mb-2 flex items-center gap-2 text-2xl font-bold tracking-tight"
                >
                  <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
                  {t('relatedGuidesHeading')}
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">{t('relatedGuidesSubheading')}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {relatedGuides.map((guide) => (
                    <Link
                      key={guide.id}
                      href={`/blog/${guide.slug}`}
                      prefetch={false}
                      className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Card className="glass-panel h-full border-border/50 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                        <CardContent className="space-y-2 p-4 sm:p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={guide.type === 'Rehber' ? 'default' : 'secondary'}>
                              {guide.type === 'Rehber' ? t('guideBadge') : t('postBadge')}
                            </Badge>
                          </div>
                          <p className="font-semibold leading-snug group-hover:text-primary">
                            {guide.title}
                          </p>
                          {guide.description ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {guide.description}
                            </p>
                          ) : null}
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                            {t('relatedGuidesCta')}
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section
              className="scroll-mt-36 border-t pt-8 sm:scroll-mt-40"
              aria-labelledby="similar-tools-heading"
            >
              <SimilarTools currentTool={tool} />
            </section>

            <section className="border-t pt-8">
              <ToolComments toolId={tool.id} toolSlug={tool.slug} />
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="glass-panel overflow-hidden border-border/50 shadow-md">
              <CardContent className="space-y-4 p-4 sm:space-y-5 sm:p-5">
                <div>
                  <p className="text-sm font-semibold">{t('sidebarTitle')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t('sidebarBody')}</p>
                </div>
                <Button asChild className="brand-gradient min-h-11 w-full shadow-md">
                  <TrackedExternalLink
                    href={tool.link}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    eventParameters={{
                      tool_slug: tool.slug,
                      category: tool.category_slug,
                      placement: 'sidebar',
                    }}
                  >
                    {t('visitSiteNamed', { name: tool.displayName })}
                    <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                  </TrackedExternalLink>
                </Button>
                <Button asChild variant="outline" className="min-h-11 w-full">
                  <Link href={compareHref} prefetch={false}>
                    <GitCompareArrows className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t('compare')}
                  </Link>
                </Button>
                <div className="rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
                  <p className="font-semibold text-foreground">{t('quickSummary')}</p>
                  <p className="mt-1">
                    {formatPricing(tool.pricing_model, tPricing) || t('pricingUnspecified')} ·{' '}
                    {platforms.slice(0, 2).join(', ')}
                    {platforms.length > 2 ? ` +${platforms.length - 2}` : ''}
                    {ratingDisplay ? ` · ★ ${ratingDisplay}` : ''}
                  </p>
                </div>
                <div
                  className={`rounded-lg border p-3 text-xs leading-5 ${linkHealth.className}`}
                  role={tool.link_check_status === 'invalid' ? 'alert' : 'status'}
                >
                  <div className="flex items-start gap-2">
                    <LinkHealthIcon
                      aria-hidden="true"
                      className={`mt-0.5 h-4 w-4 shrink-0 ${linkHealth.iconClassName}`}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{linkHealth.title}</p>
                        <Badge variant="secondary">{linkHealth.badge}</Badge>
                      </div>
                      <p className="mt-1 break-words">{linkHealth.description}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <ToolLinkReportDialog tool={tool} />
                </div>

                <div className="border-t pt-4">
                  <Suspense fallback={null}>
                    <PromoteToolButton toolId={tool.id} toolSlug={tool.slug} />
                  </Suspense>
                </div>

                <div className="border-t pt-4">
                  <ShareButtons
                    url={shareUrl}
                    title={t('shareTitle', { name: tool.displayName })}
                    label={t('shareLabel')}
                  />
                </div>
              </CardContent>
            </Card>

            <p className="px-2 text-xs leading-5 text-muted-foreground">{t('disclaimer')}</p>
          </aside>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="mx-auto flex max-w-6xl gap-2">
          <Button asChild className="brand-gradient min-h-12 flex-1 shadow-md">
            <TrackedExternalLink
              href={tool.link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              eventParameters={{
                tool_slug: tool.slug,
                category: tool.category_slug,
                placement: 'mobile_sticky',
              }}
            >
              {t('mobileCta')}
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
            </TrackedExternalLink>
          </Button>
          <Button asChild variant="outline" className="min-h-12 shrink-0 px-4">
            <Link href={compareHref} prefetch={false} aria-label={t('compare')}>
              <GitCompareArrows className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <Card className="glass-panel border-border/50 transition-shadow hover:shadow-sm">
      <CardContent className="flex items-start gap-3 p-4 sm:p-5">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 break-words font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TrustNote({ text }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-background/70 px-3 py-2">
      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
