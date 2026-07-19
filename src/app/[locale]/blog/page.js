import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  GraduationCap,
  Newspaper,
  Sparkles,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { BlogListingClient } from '@/components/BlogListingClient';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';
import { getSiteOrigin } from '@/utils/siteUrl';

export const revalidate = 3600;

async function getPublishedPosts() {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, title, slug, description, featured_image_url, published_at, type, author_id, category_id'
    )
    .eq('status', 'Yayınlandı')
    .order('published_at', { ascending: false });

  if (error) {
    logger.error('Yazılar çekilirken hata:', error);
    return [];
  }

  const { attachAuthorsToPosts, attachTagsToPosts } = await import('@/lib/contentAuthors');
  const withAuthors = await attachAuthorsToPosts(supabase, data || []);
  return attachTagsToPosts(supabase, withAuthors);
}

async function getBlogCategories(posts) {
  const ids = [
    ...new Set(
      (posts || [])
        .map((p) => p.category_id)
        .filter((id) => id != null && Number.isFinite(Number(id)))
        .map(Number)
    ),
  ];
  if (!ids.length) return [];
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .in('id', ids)
    .order('name', { ascending: true });
  if (error) {
    logger.error('Blog kategorileri çekilirken hata:', error);
    return [];
  }
  return data || [];
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Blog' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/blog' : '/blog',
  });
}

export default async function BlogPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Blog' });
  const posts = await getPublishedPosts();
  const categories = await getBlogCategories(posts);
  const { collectTagsFromPosts } = await import('@/lib/contentAuthors');
  const tags = collectTagsFromPosts(posts);
  const guidesCount = posts.filter((p) => p.type === 'Rehber').length;
  const articlesCount = posts.length - guidesCount;
  const siteUrl = getSiteOrigin();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: t('title'),
    description: t('subtitle'),
    url: `${siteUrl}${locale === 'en' ? '/en/blog' : '/blog'}`,
    inLanguage: locale === 'en' ? 'en-US' : 'tr-TR',
    blogPost: posts.slice(0, 12).map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description || undefined,
      datePublished: post.published_at || undefined,
      url: `${siteUrl}${locale === 'en' ? '/en' : ''}/blog/${post.slug}`,
    })),
  };

  const hubs = [
    {
      href: '/ogren',
      title: t('hubLearnTitle'),
      body: t('hubLearnBody'),
      icon: GraduationCap,
    },
    {
      href: '/arastirma',
      title: t('hubResearchTitle'),
      body: t('hubResearchBody'),
      icon: FlaskConical,
    },
    {
      href: '/tavsiye',
      title: t('hubRecommendTitle'),
      body: t('hubRecommendBody'),
      icon: Sparkles,
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

      <div className="mx-auto max-w-6xl space-y-12 pb-8 sm:space-y-14 sm:pb-12">
        <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
              <Newspaper className="h-4 w-4" aria-hidden="true" />
              {t('heroChip')}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              {t('title')}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('subtitle')}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold">
                {t('statsPosts', { count: posts.length })}
              </span>
              <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold">
                {t('statsGuides', { count: guidesCount })}
              </span>
              <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold">
                {t('statsArticles', { count: articlesCount })}
              </span>
            </div>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="brand-gradient min-h-12 rounded-2xl px-6 font-semibold shadow-md"
              >
                <Link href="/ogren" prefetch={false}>
                  <GraduationCap className="mr-2 h-5 w-5" aria-hidden="true" />
                  {t('ctaLearn')}
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="glass-button min-h-12 rounded-2xl px-6 font-semibold"
              >
                <Link href="/arastirma" prefetch={false}>
                  <FlaskConical className="mr-2 h-5 w-5" aria-hidden="true" />
                  {t('ctaResearch')}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {posts.length > 0 ? (
          <section aria-label={t('title')}>
            <BlogListingClient posts={posts} locale={locale} categories={categories} tags={tags} />
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold tracking-tight">{t('emptyTitle')}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('emptyBody')}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline">
                <Link href="/ogren" prefetch={false}>
                  {t('ctaLearn')}
                </Link>
              </Button>
              <Button asChild className="brand-gradient">
                <Link href="/" prefetch={false}>
                  {t('ctaTools')}
                </Link>
              </Button>
            </div>
          </section>
        )}

        <section aria-labelledby="blog-hubs-heading">
          <div className="mb-5">
            <h2
              id="blog-hubs-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              {t('hubsHeading')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('hubsSubheading')}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {hubs.map(({ href, title, body, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="glass-panel h-full border-border/50 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <CardHeader className="space-y-3 pb-2">
                    <div className="rounded-xl border bg-background p-2.5 shadow-sm w-fit">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-base group-hover:text-primary sm:text-lg">
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">{body}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      {t('hubCta')}
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t pt-10 sm:pt-14">
          <NewsletterSignup />
        </section>
      </div>
    </>
  );
}
