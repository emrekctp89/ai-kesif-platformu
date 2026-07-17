import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BookOpen,
  Compass,
  GitCompareArrows,
  GraduationCap,
  Map,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { generatePageMetadata } from '@/utils/seo';
import { getSiteOrigin } from '@/utils/siteUrl';

export const revalidate = 3600;

async function getGuides() {
  const supabase = await createClient(await cookies());
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
}

async function getLearningPaths() {
  const supabase = await createClient(await cookies());

  // Prefer tool counts; fall back if the nested count select is unavailable.
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
  const [guides, learningPaths] = await Promise.all([getGuides(), getLearningPaths()]);

  const hasPaths = learningPaths.length > 0;
  const hasGuides = guides.length > 0;
  const isEmpty = !hasPaths && !hasGuides;
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
                {t('statsPaths', { count: learningPaths.length })}
              </span>
              <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
                {t('statsGuides', { count: guides.length })}
              </span>
            </div>
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

        {isEmpty ? (
          <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center sm:px-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <WandSparkles className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight">{t('emptyTitle')}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              {t('emptyBody')}
            </p>
            <Button asChild className="brand-gradient mt-6 min-h-11 shadow-md">
              <Link href="/" prefetch={false}>
                {t('browseTools')}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </section>
        ) : null}

        {/* Learning paths */}
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
            <EmptySection message={t('pathsEmpty')} />
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
            <EmptySection message={t('guidesEmpty')} />
          )}
        </section>

        <section className="border-t pt-10 sm:pt-14">
          <NewsletterSignup />
        </section>
      </div>
    </>
  );
}

function EmptySection({ message }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-10 text-center">
      <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
    </div>
  );
}
