import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Code2,
  Compass,
  GitCompareArrows,
  GraduationCap,
  ImageIcon,
  Lightbulb,
  Map,
  Megaphone,
  Music,
  PenTool,
  Sparkles,
  Video,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { generatePageMetadata } from '@/utils/seo';
import { getSiteOrigin } from '@/utils/siteUrl';

// Public page uses auth cookies via createClient — force dynamic to avoid static/cookies clashes.
export const dynamic = 'force-dynamic';

/** Kategori slug → öğrenme rotası tanımı (i18n key + ikon) */
const CURATED_TRACKS = [
  {
    slug: 'chatbotlar',
    icon: Bot,
    titleKey: 'trackChatTitle',
    bodyKey: 'trackChatBody',
    levelKey: 'levelBeginner',
  },
  {
    slug: 'metin-yazarligi',
    icon: PenTool,
    titleKey: 'trackWriteTitle',
    bodyKey: 'trackWriteBody',
    levelKey: 'levelBeginner',
  },
  {
    slug: 'gorsel-uretim',
    icon: ImageIcon,
    titleKey: 'trackImageTitle',
    bodyKey: 'trackImageBody',
    levelKey: 'levelBeginner',
  },
  {
    slug: 'video-uretim',
    icon: Video,
    titleKey: 'trackVideoTitle',
    bodyKey: 'trackVideoBody',
    levelKey: 'levelIntermediate',
  },
  {
    slug: 'kod-yazilim',
    icon: Code2,
    titleKey: 'trackCodeTitle',
    bodyKey: 'trackCodeBody',
    levelKey: 'levelIntermediate',
  },
  {
    slug: 'pazarlama',
    icon: Megaphone,
    titleKey: 'trackMarketingTitle',
    bodyKey: 'trackMarketingBody',
    levelKey: 'levelIntermediate',
  },
  {
    slug: 'uretkenlik',
    icon: Zap,
    titleKey: 'trackProductivityTitle',
    bodyKey: 'trackProductivityBody',
    levelKey: 'levelBeginner',
  },
  {
    slug: 'ses-muzik',
    icon: Music,
    titleKey: 'trackAudioTitle',
    bodyKey: 'trackAudioBody',
    levelKey: 'levelIntermediate',
  },
];

async function getGuides() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('posts')
      .select('title, slug, description, featured_image_url, published_at')
      .eq('status', 'Yayınlandı')
      .eq('type', 'Rehber')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Rehberler çekilirken hata:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Rehberler beklenmeyen hata:', error);
    return [];
  }
}

async function getLearningPaths() {
  try {
    const supabase = await createClient();

    let { data, error } = await supabase
      .from('collections')
      .select('title, slug, description, profiles(username), collection_tools(count)')
      .eq('is_public', true)
      .eq('type', 'Öğrenme Yolu')
      .order('created_at', { ascending: false });

    if (error) {
      const fallback = await supabase
        .from('collections')
        .select('title, slug, description, profiles(username)')
        .eq('is_public', true)
        .eq('type', 'Öğrenme Yolu')
        .order('created_at', { ascending: false });

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Öğrenme yolları çekilirken hata:', error);
      return [];
    }

    return (data || []).map((path) => {
      const countRow = Array.isArray(path.collection_tools) ? path.collection_tools[0] : null;
      const toolsCount = Number(countRow?.count) || 0;
      const profile = Array.isArray(path.profiles) ? path.profiles[0] : path.profiles;
      return {
        title: path.title,
        slug: path.slug,
        description: path.description,
        authorUsername: profile?.username || null,
        toolsCount,
      };
    });
  } catch (error) {
    console.error('Öğrenme yolları beklenmeyen hata:', error);
    return [];
  }
}

async function getCuratedTracksWithTools() {
  try {
    const supabase = await createClient();
    const slugs = CURATED_TRACKS.map((track) => track.slug);

    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, slug')
      .in('slug', slugs);

    if (error || !categories?.length) {
      if (error) console.error('Kategori öğrenme rotaları hatası:', error);
      return CURATED_TRACKS.map((track) => ({
        ...track,
        categoryName: null,
        tools: [],
      }));
    }

    const bySlug = new Map(categories.map((category) => [category.slug, category]));

    const tracks = await Promise.all(
      CURATED_TRACKS.map(async (track) => {
        const category = bySlug.get(track.slug);
        if (!category) {
          return { ...track, categoryName: null, tools: [] };
        }

        const { data: tools } = await supabase
          .from('tools')
          .select('name, slug, description, pricing_model')
          .eq('category_id', category.id)
          .eq('is_approved', true)
          .order('updated_at', { ascending: false })
          .limit(4);

        return {
          ...track,
          categoryName: category.name,
          tools: tools || [],
        };
      })
    );

    return tracks.filter((track) => track.tools.length > 0 || track.categoryName);
  } catch (error) {
    console.error('Kategori rotaları beklenmeyen hata:', error);
    return CURATED_TRACKS.map((track) => ({ ...track, categoryName: null, tools: [] }));
  }
}

function formatDate(value, locale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Learn' });
  const path = locale === 'en' ? '/en/ogren' : '/ogren';

  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path,
  });
}

export default async function LearningHubPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Learn' });

  let guides = [];
  let learningPaths = [];
  let curatedTracks = [];
  try {
    [guides, learningPaths, curatedTracks] = await Promise.all([
      getGuides(),
      getLearningPaths(),
      getCuratedTracksWithTools(),
    ]);
  } catch (error) {
    console.error('Öğren sayfası veri hatası:', error);
  }

  const hasPaths = learningPaths.length > 0;
  const hasGuides = guides.length > 0;
  const hasTracks = curatedTracks.length > 0;
  const siteUrl = getSiteOrigin();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('title'),
    description: t('subtitle'),
    url: `${siteUrl}${locale === 'en' ? '/en/ogren' : '/ogren'}`,
    inLanguage: locale === 'en' ? 'en-US' : 'tr-TR',
    isPartOf: {
      '@type': 'WebSite',
      name: 'AI Keşif Platformu',
      url: siteUrl,
    },
  };

  const quickStarts = [
    {
      href: '/tavsiye',
      label: t('ctaRecommend'),
      icon: Sparkles,
      className: 'ai-tavsiye-gradient text-white border-0',
    },
    {
      href: '/kategori',
      label: t('ctaCategories'),
      icon: Compass,
      className: 'glass-button',
    },
    {
      href: '/blog',
      label: t('ctaBlog'),
      icon: BookOpen,
      className: 'glass-button',
    },
    {
      href: '/karsilastir',
      label: t('ctaCompare'),
      icon: GitCompareArrows,
      className: 'glass-button',
    },
  ];

  const steps = [
    { title: t('step1Title'), body: t('step1Body'), icon: Compass },
    { title: t('step2Title'), body: t('step2Body'), icon: Lightbulb },
    { title: t('step3Title'), body: t('step3Body'), icon: GitCompareArrows },
    { title: t('step4Title'), body: t('step4Body'), icon: WandSparkles },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />

      <div className="mx-auto max-w-6xl space-y-12 pb-8 sm:space-y-16 sm:pb-12">
        {/* Hero */}
        <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              {t('heroChip')}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              {t('title')}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('subtitle')}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
                {t('statsTracks', { count: curatedTracks.length })}
              </span>
              <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
                {t('statsPaths', { count: learningPaths.length })}
              </span>
              <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
                {t('statsGuides', { count: guides.length })}
              </span>
            </div>

            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="ai-tavsiye-gradient min-h-12 rounded-2xl px-6 shadow-xl"
              >
                <Link href="/tavsiye" prefetch={false} className="font-semibold">
                  <Sparkles className="mr-2 h-5 w-5" aria-hidden="true" />
                  {t('ctaRecommend')}
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="glass-button min-h-12 rounded-2xl px-6"
              >
                <Link href="/kategori" prefetch={false} className="font-semibold">
                  <Compass className="mr-2 h-5 w-5" aria-hidden="true" />
                  {t('ctaCategories')}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How to learn on the platform */}
        <section aria-labelledby="learn-steps-heading">
          <div className="mb-5 sm:mb-6">
            <h2
              id="learn-steps-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              {t('stepsHeading')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('stepsSubheading')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ title, body, icon: Icon }, index) => (
              <Card
                key={title}
                className="glass-panel border-border/50 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardHeader className="space-y-3 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="rounded-xl border bg-background p-2.5 shadow-sm">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick starts */}
        <section aria-labelledby="learn-quickstart-heading">
          <div className="mb-5 sm:mb-6">
            <h2
              id="learn-quickstart-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              {t('quickStartHeading')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('quickStartSubheading')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickStarts.map(({ href, label, icon: Icon, className }) => (
              <Button
                key={href}
                asChild
                variant="outline"
                className={`min-h-12 justify-start gap-2 rounded-2xl px-4 font-semibold ${className}`}
              >
                <Link href={href} prefetch={false}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                </Link>
              </Button>
            ))}
          </div>
        </section>

        {/* Curated category tracks with live tools */}
        {hasTracks ? (
          <section aria-labelledby="learn-tracks-heading">
            <div className="mb-5 sm:mb-6">
              <h2
                id="learn-tracks-heading"
                className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                <Map className="h-7 w-7 text-primary" aria-hidden="true" />
                {t('tracksHeading')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('tracksSubheading')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-5">
              {curatedTracks.map((track) => {
                const Icon = track.icon;
                return (
                  <Card
                    key={track.slug}
                    className="glass-panel overflow-hidden border-border/50 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-xl border bg-background p-2 shadow-sm">
                          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        </div>
                        <Badge variant="secondary" className="font-semibold">
                          {t(track.levelKey)}
                        </Badge>
                        {track.categoryName ? (
                          <Badge variant="outline">{track.categoryName}</Badge>
                        ) : null}
                      </div>
                      <CardTitle className="text-lg leading-snug sm:text-xl">
                        {t(track.titleKey)}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">{t(track.bodyKey)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      {track.tools.length > 0 ? (
                        <ul className="space-y-2">
                          {track.tools.map((tool) => (
                            <li key={tool.slug}>
                              <Link
                                href={`/tool/${tool.slug}`}
                                prefetch={false}
                                className="group/tool flex items-start justify-between gap-2 rounded-lg border border-transparent bg-muted/30 px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-muted/50"
                              >
                                <span className="min-w-0">
                                  <span className="font-semibold text-foreground group-hover/tool:text-primary">
                                    {tool.name}
                                  </span>
                                  {tool.description ? (
                                    <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">
                                      {tool.description}
                                    </span>
                                  ) : null}
                                </span>
                                <ArrowRight
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover/tool:translate-x-0.5 group-hover/tool:text-primary"
                                  aria-hidden="true"
                                />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('trackNoTools')}</p>
                      )}

                      <Button asChild variant="outline" size="sm" className="w-full rounded-xl">
                        <Link href={`/kategori/${track.slug}`} prefetch={false}>
                          {t('openCategory')}
                          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Community learning paths from DB */}
        <section aria-labelledby="learn-paths-heading">
          <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="learn-paths-heading"
                className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                <Map className="h-7 w-7 text-primary" aria-hidden="true" />
                {t('pathsHeading')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('pathsSubheading')}</p>
            </div>
          </div>

          {hasPaths ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {learningPaths.map((path) => (
                <Link
                  key={path.slug}
                  href={`/koleksiyonlar/${path.slug}`}
                  className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  prefetch={false}
                >
                  <Card className="glass-panel h-full overflow-hidden border-border/50 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          <Map className="mr-1 h-3 w-3" aria-hidden="true" />
                          {t('pathsHeading')}
                        </Badge>
                        {path.toolsCount > 0 ? (
                          <Badge variant="outline">
                            {t('toolsCount', { count: path.toolsCount })}
                          </Badge>
                        ) : null}
                      </div>
                      <CardTitle className="text-lg leading-snug transition-colors group-hover:text-primary sm:text-xl">
                        {path.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {path.description || ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto flex items-center justify-between gap-3 pt-0">
                      <p className="truncate text-xs text-muted-foreground">
                        {t('createdBy', {
                          name: path.authorUsername || t('unknownAuthor'),
                        })}
                      </p>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                        {t('openPath')}
                        <ArrowRight
                          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptySection
              message={t('pathsEmpty')}
              ctaHref="/koleksiyonlar"
              ctaLabel={t('browseCollections')}
            />
          )}
        </section>

        {/* Guides */}
        <section aria-labelledby="learn-guides-heading">
          <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="learn-guides-heading"
                className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                <BookOpen className="h-7 w-7 text-primary" aria-hidden="true" />
                {t('guidesHeading')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('guidesSubheading')}</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="self-start sm:self-auto">
              <Link href="/blog" prefetch={false}>
                {t('viewAllBlog')}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {hasGuides ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {guides.map((post) => {
                const publishedLabel = formatDate(post.published_at, locale);
                return (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    prefetch={false}
                  >
                    <Card className="glass-panel h-full overflow-hidden border-border/50 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                      {post.featured_image_url ? (
                        <div className="relative aspect-video overflow-hidden bg-muted">
                          <Image
                            src={post.featured_image_url}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-indigo-950/20 via-muted to-purple-800/20">
                          <BookOpen
                            className="h-10 w-10 text-muted-foreground/60"
                            aria-hidden="true"
                          />
                        </div>
                      )}
                      <CardHeader className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-semibold">
                            {t('guidesHeading')}
                          </Badge>
                          {publishedLabel ? (
                            <span className="text-xs text-muted-foreground">{publishedLabel}</span>
                          ) : null}
                        </div>
                        <CardTitle className="text-lg leading-snug transition-colors group-hover:text-primary sm:text-xl">
                          {post.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {post.description || ''}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                          {t('readGuide')}
                          <ArrowRight
                            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptySection message={t('guidesEmpty')} ctaHref="/blog" ctaLabel={t('viewAllBlog')} />
          )}
        </section>

        {/* Bottom CTA */}
        <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center glass-panel sm:p-8">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t('ctaBandTitle')}</h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t('ctaBandBody')}</p>
            <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
              <Button
                asChild
                className="ai-tavsiye-gradient min-h-11 rounded-xl border-0 font-semibold"
              >
                <Link href="/tavsiye" prefetch={false}>
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('ctaRecommend')}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="glass-button min-h-11 rounded-xl font-semibold"
              >
                <Link href="/" prefetch={false}>
                  {t('browseTools')}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t pt-10 sm:pt-14">
          <NewsletterSignup />
        </section>
      </div>
    </>
  );
}

function EmptySection({ message, ctaHref, ctaLabel }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-10 text-center">
      <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
      {ctaHref && ctaLabel ? (
        <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
          <Link href={ctaHref} prefetch={false}>
            {ctaLabel}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
