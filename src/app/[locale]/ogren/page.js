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
  PlayCircle,
  Clock,
  BarChart,
  Video,
  ChevronRight,
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

  const mockCourses = [
    {
      title: locale === 'en' ? 'ChatGPT for Beginners' : 'Yeni Başlayanlar için ChatGPT',
      instructor: 'AI Keşif Akademi',
      duration: '2s 15d',
      level: locale === 'en' ? 'Beginner' : 'Başlangıç',
      thumbnail:
        'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800',
      slug: 'yeni-baslayanlar-icin-chatgpt',
      color: 'from-emerald-500/20 to-teal-500/20',
      tag: locale === 'en' ? 'Most Popular' : 'En Popüler',
    },
    {
      title:
        locale === 'en'
          ? 'Professional Imagery with Midjourney'
          : 'Midjourney ile Profesyonel Görsel Üretimi',
      instructor: 'Caner Ö.',
      duration: '1s 45d',
      level: locale === 'en' ? 'Intermediate' : 'Orta Seviye',
      thumbnail:
        'https://images.unsplash.com/photo-1686191128892-3b37013f7331?auto=format&fit=crop&q=80&w=800',
      slug: 'midjourney-gorsel-uretimi',
      color: 'from-purple-500/20 to-pink-500/20',
      tag: locale === 'en' ? 'New' : 'Yeni',
    },
    {
      title: locale === 'en' ? 'GitHub Copilot for Developers' : 'Yazılımcılar için GitHub Copilot',
      instructor: 'AI Keşif Akademi',
      duration: '3s 20d',
      level: locale === 'en' ? 'Advanced' : 'İleri Seviye',
      thumbnail:
        'https://images.unsplash.com/photo-1668554245893-2430d0077217?auto=format&fit=crop&q=80&w=800',
      slug: 'github-copilot-rehberi',
      color: 'from-blue-500/20 to-cyan-500/20',
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

      <div className="mx-auto max-w-7xl space-y-16 pb-12 sm:space-y-24 sm:pb-20">
        {/* HERO SECTION - Academy Style */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-background to-purple-950 p-8 shadow-2xl sm:p-12 lg:p-16 border border-border/20">
          <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-purple-500/20 blur-[100px]" />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary backdrop-blur-md">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
              AI Keşif Akademi
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                Yapay Zeka
              </span>{' '}
              Uzmanı Olun
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
              Video kurslar, rehberler ve adım adım öğrenme yollarıyla AI araçlarını işinize nasıl
              entegre edeceğinizi keşfedin.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-14 rounded-full px-8 text-base font-bold shadow-lg shadow-primary/25 ai-tavsiye-gradient"
              >
                Eğitime Başla
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-full px-8 text-base font-bold bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
              >
                <Video className="mr-2 h-5 w-5" aria-hidden="true" />
                Kataloğu İncele
              </Button>
            </div>
          </div>
        </section>

        {/* MOCK VIDEO COURSES */}
        <section aria-labelledby="courses-heading" className="relative px-4 sm:px-0">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="courses-heading"
                className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl"
              >
                <PlayCircle className="h-8 w-8 text-rose-500" aria-hidden="true" />
                {locale === 'en' ? 'Video Courses' : 'Video Eğitimler'}
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                {locale === 'en'
                  ? 'Learn from the best with step-by-step video tutorials'
                  : 'Adım adım video rehberlerle araçları profesyonelce kullanmayı öğrenin.'}
              </p>
            </div>
            <Button variant="ghost" className="hidden sm:flex group">
              Tümünü Gör
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockCourses.map((course) => (
              <Link
                key={course.slug}
                href={`#`} // Mock link
                className="group block rounded-3xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-t-3xl bg-muted">
                  <div className="absolute inset-0 z-10 bg-black/20 transition-colors group-hover:bg-black/10" />
                  {course.tag && (
                    <div className="absolute top-4 left-4 z-20 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                      {course.tag}
                    </div>
                  )}
                  <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                      <PlayCircle className="h-8 w-8 text-white" fill="currentColor" />
                    </div>
                  </div>
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6">
                  <div className="mb-3 flex items-center gap-4 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <BarChart className="h-3.5 w-3.5" />
                      {course.level}
                    </div>
                  </div>
                  <h3 className="line-clamp-2 text-xl font-bold leading-snug transition-colors group-hover:text-primary">
                    {course.title}
                  </h3>
                  <div className="mt-4 flex items-center gap-3 border-t pt-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      {course.instructor.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {course.instructor}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Button variant="outline" className="mt-6 w-full sm:hidden">
            Tümünü Gör
          </Button>
        </section>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8 px-4 sm:px-0">
          {/* LEARNING PATHS (Öğrenme Yolları) - Left Column */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  <Map className="h-7 w-7 text-emerald-500" aria-hidden="true" />
                  {t('pathsHeading')}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{t('pathsSubheading')}</p>
              </div>
            </div>

            {hasPaths ? (
              <div className="grid gap-4 sm:gap-6">
                {learningPaths.map((path, idx) => (
                  <Link
                    key={path.slug}
                    href={`/koleksiyonlar/${path.slug}`}
                    className="group block rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xl">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold leading-snug transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {path.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {path.description || ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center justify-between sm:flex-col sm:items-end gap-2 border-t pt-4 sm:border-0 sm:pt-0">
                        <Badge variant="secondary" className="font-semibold bg-muted">
                          {path.toolsCount} Araç
                        </Badge>
                        <span className="flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          İncele{' '}
                          <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptySection message={t('pathsEmpty')} />
            )}
          </div>

          {/* GUIDES (Rehberler) - Right Column Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  <BookOpen className="h-7 w-7 text-blue-500" aria-hidden="true" />
                  {t('guidesHeading')}
                </h2>
              </div>
            </div>

            {hasGuides ? (
              <div className="flex flex-col gap-4">
                {guides.slice(0, 4).map((post) => {
                  const publishedLabel = formatDate(post.published_at, locale);
                  return (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group flex gap-4 rounded-2xl p-3 hover:bg-muted/50 transition-colors"
                    >
                      {post.featured_image_url ? (
                        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                          <Image
                            src={post.featured_image_url}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="100px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                          <BookOpen className="h-6 w-6 text-blue-500/50" />
                        </div>
                      )}
                      <div className="flex flex-col justify-center">
                        <h4 className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {post.title}
                        </h4>
                        {publishedLabel && (
                          <span className="mt-1 text-[11px] font-medium text-muted-foreground">
                            {publishedLabel}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
                <Button asChild variant="outline" className="mt-2 w-full rounded-xl border-dashed">
                  <Link href="/blog">
                    {t('viewAllBlog')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptySection message={t('guidesEmpty')} />
            )}

            {/* Quick Starts Widget */}
            <div className="rounded-3xl border bg-gradient-to-br from-muted/50 to-muted/10 p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4">{t('quickStartHeading')}</h3>
              <div className="flex flex-col gap-2">
                {quickStarts.map(({ href, label, icon: Icon, className }) => (
                  <Button
                    key={href}
                    asChild
                    variant="ghost"
                    className="w-full justify-start gap-3 rounded-xl bg-background/50 hover:bg-background shadow-sm"
                  >
                    <Link href={href} prefetch={false}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      </div>
                      <span className="font-semibold">{label}</span>
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="border-t pt-10 sm:pt-14 px-4 sm:px-0">
          <NewsletterSignup />
        </section>
      </div>
    </>
  );
}

function EmptySection({ message }) {
  return (
    <div className="rounded-3xl border border-dashed bg-muted/10 px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-4">
        <WandSparkles className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mx-auto max-w-md text-sm font-medium leading-6 text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
