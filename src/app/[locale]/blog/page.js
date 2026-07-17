import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, GraduationCap, Newspaper } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { NewsletterSignup } from '@/components/NewsletterSignup';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

export const revalidate = 3600;

async function getPublishedPosts() {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('posts')
    .select('title, slug, description, featured_image_url, published_at, type')
    .eq('status', 'Yayınlandı')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Yazılar çekilirken hata:', error);
    return [];
  }
  return data || [];
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

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-8 sm:space-y-14 sm:pb-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Newspaper className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold">
              {t('statsPosts', { count: posts.length })}
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="glass-button min-h-9 rounded-full"
            >
              <Link href="/ogren" prefetch={false}>
                <GraduationCap className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t('ctaLearn')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {posts.length > 0 ? (
        <section aria-label={t('title')}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 sm:gap-8">
            {posts.map((post) => {
              const dateLabel = formatDate(post.published_at, locale);
              const isGuide = post.type === 'Rehber';
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
                      <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-indigo-950/15 via-muted to-purple-800/15">
                        <BookOpen
                          className="h-10 w-10 text-muted-foreground/50"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                    <CardHeader className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={isGuide ? 'default' : 'outline'} className="font-semibold">
                          {isGuide ? t('guideBadge') : t('postBadge')}
                        </Badge>
                        {dateLabel ? (
                          <span className="text-xs text-muted-foreground">{dateLabel}</span>
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
                        {t('readMore')}
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

      <section className="border-t pt-10 sm:pt-14">
        <NewsletterSignup />
      </section>
    </div>
  );
}
