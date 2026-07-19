'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, BookOpen, Search, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authorDisplayName } from '@/lib/contentAuthors';

function formatDate(value, locale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

function PostCard({ post, locale, t, featured = false }) {
  const dateLabel = formatDate(post.published_at, locale);
  const isGuide = post.type === 'Rehber';
  const authorName = authorDisplayName(post, t('defaultAuthor'));
  const authorHref = post.author?.username ? `/u/${post.author.username}` : null;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        featured ? 'md:col-span-2' : ''
      }`}
      prefetch={false}
    >
      <Card
        className={`glass-panel h-full overflow-hidden border-border/50 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg ${
          featured ? 'md:grid md:grid-cols-2 md:items-stretch' : ''
        }`}
      >
        <div
          className={`relative overflow-hidden bg-muted ${
            featured ? 'aspect-[16/10] md:aspect-auto md:min-h-[280px]' : 'aspect-video'
          }`}
        >
          {post.featured_image_url ? (
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes={featured ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 100vw, 33vw'}
              priority={featured}
            />
          ) : (
            <div className="flex h-full min-h-[180px] items-center justify-center bg-gradient-to-br from-indigo-950/15 via-muted to-purple-800/15">
              <BookOpen className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {featured ? <Badge className="font-semibold">{t('featuredBadge')}</Badge> : null}
              <Badge variant={isGuide ? 'default' : 'outline'} className="font-semibold">
                {isGuide ? t('guideBadge') : t('postBadge')}
              </Badge>
              {dateLabel ? (
                <span className="text-xs text-muted-foreground">{dateLabel}</span>
              ) : null}
            </div>
            <CardTitle
              className={`leading-snug transition-colors group-hover:text-primary ${
                featured ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
              }`}
            >
              {post.title}
            </CardTitle>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {t('byAuthor')}{' '}
                {authorHref ? (
                  <span className="font-medium text-foreground/80 group-hover:text-primary">
                    {authorName}
                  </span>
                ) : (
                  <span className="font-medium text-foreground/80">{authorName}</span>
                )}
              </span>
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-0">
            <p
              className={`text-sm text-muted-foreground ${featured ? 'line-clamp-4' : 'line-clamp-3'}`}
            >
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
        </div>
      </Card>
    </Link>
  );
}

/**
 * @param {{ posts: Array, locale: string }} props
 */
export function BlogListingClient({ posts, locale }) {
  const t = useTranslations('Blog');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all | guide | post

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return (posts || []).filter((post) => {
      const isGuide = post.type === 'Rehber';
      if (filter === 'guide' && !isGuide) return false;
      if (filter === 'post' && isGuide) return false;
      if (!q) return true;
      const hay = `${post.title || ''} ${post.description || ''}`.toLocaleLowerCase('tr-TR');
      return hay.includes(q);
    });
  }, [posts, query, filter]);

  const featured = filtered[0] || null;
  const rest = featured ? filtered.slice(1) : [];

  const filters = [
    { id: 'all', label: t('filterAll') },
    { id: 'guide', label: t('filterGuides') },
    { id: 'post', label: t('filterPosts') },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex flex-wrap gap-1 rounded-full border border-border/60 bg-background/70 p-1"
          role="tablist"
          aria-label={t('filterAria')}
        >
          {filters.map((item) => {
            const active = filter === item.id;
            return (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={active ? 'default' : 'ghost'}
                className="min-h-9 rounded-full px-3.5"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </Button>
            );
          })}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="min-h-10 pl-9"
            aria-label={t('searchPlaceholder')}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('resultsCount', { count: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold tracking-tight">{t('noResultsTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {t('noResultsBody')}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
          >
            {t('clearFilters')}
          </Button>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 sm:gap-8">
          {featured ? <PostCard post={featured} locale={locale} t={t} featured /> : null}
          {rest.map((post) => (
            <PostCard key={post.slug} post={post} locale={locale} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
