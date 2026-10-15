import { ArrowUpRight, Clock3, Newspaper, Radio, Sparkles } from 'lucide-react';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/server';
import { generatePageMetadata } from '@/utils/seo';
import logger from '@/utils/logger';

export const revalidate = 900;

const FRESH_WINDOW_DAYS = 7;

function isCommunityItem(item) {
  return item.source_id?.startsWith('reddit-');
}

function isUsefulCommunityItem(item) {
  if (!isCommunityItem(item)) return true;
  const title = item.title?.trim() || '';
  const lowSignal = /^(r\.i\.p\.|big or small\?|the internet is wild)/i.test(title);
  return !lowSignal && title.length >= 32;
}

function cleanSummary(item) {
  if (!item.summary) return '';
  return item.summary
    .replace(/submitted by \/u\/\S+ to r\/\S+/gi, '')
    .replace(/\[(?:link|comments)\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getFreshNews() {
  const supabase = await createClient(await cookies());
  const since = new Date(Date.now() - FRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('ai_news_items')
    .select('id, source_id, source_name, source_url, title, summary, article_url, published_at')
    .eq('is_published', true)
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(48);

  if (error) {
    logger.error('Güncel AI haberleri alınamadı:', error);
    return [];
  }

  return (data || []).filter(isUsefulCommunityItem).map((item) => ({
    ...item,
    summary: cleanSummary(item),
  }));
}

function formatRelativeDate(value, locale, t) {
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (elapsedMinutes < 60) return t('minutesAgo', { count: Math.max(1, elapsedMinutes) });
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return t('hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days <= FRESH_WINDOW_DAYS) return t('daysAgo', { count: days });
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function SourceBadge({ item, communityLabel, officialLabel }) {
  const community = isCommunityItem(item);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={community ? 'secondary' : 'default'} className="rounded-full">
        {item.source_name}
      </Badge>
      <span className="text-xs font-medium text-muted-foreground">
        {community ? communityLabel : officialLabel}
      </span>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'NewsPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/haberler' : '/haberler',
  });
}

export default async function NewsPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'NewsPage' });
  const news = await getFreshNews();
  const lead = news.find((item) => !isCommunityItem(item)) || news[0];
  const remaining = news.filter((item) => item.id !== lead?.id);

  return (
    <main className="mx-auto max-w-6xl space-y-10 pb-14">
      <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/12 via-card to-purple-500/10 px-6 py-9 shadow-sm sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/75 px-3 py-1.5 text-sm font-semibold text-primary backdrop-blur">
            <Radio className="h-4 w-4" aria-hidden="true" />
            {t('liveBadge')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{t('title')}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            {t('freshnessNote')}
          </div>
        </div>
      </header>

      {lead ? (
        <section aria-labelledby="lead-news-heading">
          <a
            href={lead.article_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="overflow-hidden border-primary/25 bg-card shadow-lg transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl">
              <CardContent className="grid gap-0 p-0 md:grid-cols-[0.82fr_1.18fr]">
                <div className="flex min-h-56 items-center justify-center bg-gradient-to-br from-primary/20 via-purple-500/15 to-background p-8">
                  <div className="text-center">
                    <Sparkles className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
                    <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-primary">
                      {t('leadLabel')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-9">
                  <SourceBadge
                    item={lead}
                    communityLabel={t('communitySource')}
                    officialLabel={t('officialSource')}
                  />
                  <h2
                    id="lead-news-heading"
                    className="mt-5 text-2xl font-bold leading-tight sm:text-3xl"
                  >
                    {lead.title}
                  </h2>
                  {lead.summary ? (
                    <p className="mt-4 line-clamp-3 leading-relaxed text-muted-foreground">
                      {lead.summary}
                    </p>
                  ) : null}
                  <div className="mt-6 flex items-center justify-between gap-4 text-sm">
                    <time
                      dateTime={lead.published_at}
                      className="font-medium text-muted-foreground"
                    >
                      {formatRelativeDate(lead.published_at, locale, t)}
                    </time>
                    <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                      {t('readAtSource')}
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </a>
        </section>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center text-muted-foreground">
            <Newspaper className="mx-auto mb-4 h-10 w-10" aria-hidden="true" />
            {t('empty')}
          </CardContent>
        </Card>
      )}

      {remaining.length > 0 ? (
        <section aria-labelledby="latest-news-heading">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2
                id="latest-news-heading"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                {t('latestHeading')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('latestSubheading')}</p>
            </div>
            <Badge variant="secondary" className="shrink-0 rounded-full">
              {t('newsCount', { count: news.length })}
            </Badge>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {remaining.map((item) => (
              <a
                key={item.id}
                href={item.article_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full border-border/60 bg-card/80 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <CardContent className="flex h-full flex-col p-5">
                    <SourceBadge
                      item={item}
                      communityLabel={t('communitySource')}
                      officialLabel={t('officialSource')}
                    />
                    <h3 className="mt-4 line-clamp-3 text-lg font-bold leading-snug group-hover:text-primary">
                      {item.title}
                    </h3>
                    {item.summary ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {item.summary}
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs">
                      <time
                        dateTime={item.published_at}
                        className="font-medium text-muted-foreground"
                      >
                        {formatRelativeDate(item.published_at, locale, t)}
                      </time>
                      <ArrowUpRight className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
