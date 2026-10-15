import { ArrowRight, ArrowUpRight, Calendar, Clock3, Mail, Newspaper, Radio } from 'lucide-react';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { NewsletterSignup } from '@/components/NewsletterSignup';
import { MarketTicker } from '@/components/news/MarketTicker';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@/i18n/routing';
import logger from '@/utils/logger';
import { generatePageMetadata } from '@/utils/seo';
import { createClient } from '@/utils/supabase/server';

export const revalidate = 300;
const FRESH_WINDOW_DAYS = 7;
const MARKET_SYMBOLS = [
  ['BTC-USD', 'Bitcoin'],
  ['ETH-USD', 'Ethereum'],
  ['GC=F', 'Altın'],
  ['CL=F', 'Petrol'],
  ['^GSPC', 'S&P 500'],
  ['^IXIC', 'Nasdaq'],
  ['THYAO.IS', 'THYAO'],
  ['GARAN.IS', 'GARAN'],
  ['USDTRY=X', 'USD/TRY'],
  ['EURTRY=X', 'EUR/TRY'],
];

function isCommunityItem(item) {
  return item.source_id?.startsWith('reddit-');
}

function isUsefulCommunityItem(item) {
  if (!isCommunityItem(item)) return true;
  const title = item.title?.trim() || '';
  return !/^(r\.i\.p\.|big or small\?|the internet is wild)/i.test(title) && title.length >= 32;
}

function cleanSummary(item) {
  if (!item.summary) return '';
  return item.summary
    .replace(/submitted by \/u\/\S+ to r\/\S+/gi, '')
    .replace(/\[(?:link|comments)\]/gi, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getNewsCenterData() {
  const supabase = await createClient(await cookies());
  const since = new Date(Date.now() - FRESH_WINDOW_DAYS * 86400000).toISOString();
  const [newsResult, newsletterResult] = await Promise.all([
    supabase
      .from('ai_news_items')
      .select('id, source_id, source_name, title, summary, article_url, published_at')
      .eq('is_published', true)
      .gte('published_at', since)
      .order('published_at', { ascending: false })
      .limit(48),
    supabase
      .from('newsletters')
      .select('title, slug, description, subject, sent_at')
      .order('sent_at', { ascending: false })
      .limit(8),
  ]);
  if (newsResult.error) logger.error('Güncel AI haberleri alınamadı:', newsResult.error);
  if (newsletterResult.error) logger.error('Bülten arşivi alınamadı:', newsletterResult.error);
  return {
    news: (newsResult.data || [])
      .filter(isUsefulCommunityItem)
      .map((item) => ({ ...item, summary: cleanSummary(item) })),
    newsletters: newsletterResult.data || [],
  };
}

async function getMarketData() {
  const results = await Promise.allSettled(
    MARKET_SYMBOLS.map(async ([symbol, label]) => {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
        {
          next: { revalidate: 300 },
          headers: { 'User-Agent': 'AI-Kesif-News/1.0' },
        }
      );
      if (!response.ok) throw new Error(`Market data ${response.status}`);
      const result = (await response.json()).chart?.result?.[0];
      const price = result?.meta?.regularMarketPrice;
      const closes = (result?.indicators?.quote?.[0]?.close || []).filter(Number.isFinite);
      const previous = closes.length > 1 ? closes.at(-2) : result?.meta?.chartPreviousClose;
      if (!Number.isFinite(price)) throw new Error('Market price missing');
      const changePercent =
        Number.isFinite(previous) && previous !== 0 ? ((price - previous) / previous) * 100 : 0;
      return { symbol, label, price, changePercent, currency: result.meta.currency };
    })
  );
  return results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
}

function formatRelativeDate(value, t) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return t('minutesAgo', { count: Math.max(1, minutes) });
  const hours = Math.floor(minutes / 60);
  return hours < 24
    ? t('hoursAgo', { count: hours })
    : t('daysAgo', { count: Math.floor(hours / 24) });
}

function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function SourceBadge({ item, t }) {
  const community = isCommunityItem(item);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={community ? 'secondary' : 'default'} className="rounded-full">
        {item.source_name}
      </Badge>
      <span className="text-xs font-medium text-muted-foreground">
        {community ? t('communitySource') : t('officialSource')}
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
  const [t, newsletterT, data, markets] = await Promise.all([
    getTranslations({ locale, namespace: 'NewsPage' }),
    getTranslations({ locale, namespace: 'NewsletterPage' }),
    getNewsCenterData(),
    getMarketData(),
  ]);
  const lead = data.news.find((item) => !isCommunityItem(item)) || data.news[0];
  const remaining = data.news.filter((item) => item.id !== lead?.id);
  return (
    <main className="mx-auto max-w-7xl space-y-10 pb-16">
      <MarketTicker items={markets} locale={locale} label={t('marketTickerLabel')} />
      <header className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-6 py-10 text-white shadow-2xl sm:px-10 lg:px-14 lg:py-14">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative grid items-end gap-8 lg:grid-cols-[1fr_0.7fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold backdrop-blur">
              <Radio className="h-4 w-4 text-cyan-300" />
              {t('liveBadge')}
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {t('title')}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {t('subtitle')}
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
              <Clock3 className="h-4 w-4" />
              {t('freshnessNote')}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Mail className="h-4 w-4 text-violet-300" />
              {newsletterT('heroChip')}
            </div>
            <p className="mb-4 text-sm leading-relaxed text-slate-300">{newsletterT('subtitle')}</p>
            <NewsletterSignup compact />
          </div>
        </div>
      </header>
      {lead ? (
        <a
          href={lead.article_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <Card className="overflow-hidden border-primary/20 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
            <CardContent className="grid p-0 lg:grid-cols-[0.55fr_1fr]">
              <div className="flex min-h-48 items-end bg-gradient-to-br from-indigo-600 via-violet-700 to-fuchsia-700 p-7 text-white">
                <div>
                  <Newspaper className="mb-4 h-9 w-9" />
                  <p className="text-sm font-black uppercase tracking-[0.2em]">{t('leadLabel')}</p>
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <SourceBadge item={lead} t={t} />
                <h2 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">{lead.title}</h2>
                {lead.summary ? (
                  <p className="mt-4 line-clamp-3 text-base leading-relaxed text-muted-foreground">
                    {lead.summary}
                  </p>
                ) : null}
                <div className="mt-6 flex items-center justify-between text-sm">
                  <time className="text-muted-foreground">
                    {formatRelativeDate(lead.published_at, t)}
                  </time>
                  <span className="inline-flex items-center gap-1 font-bold text-primary">
                    {t('readAtSource')}
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </a>
      ) : null}
      <section aria-labelledby="latest-news-heading">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="latest-news-heading" className="text-3xl font-black tracking-tight">
              {t('latestHeading')}
            </h2>
            <p className="mt-1 text-muted-foreground">{t('latestSubheading')}</p>
          </div>
          <Badge variant="secondary" className="rounded-full">
            {t('newsCount', { count: data.news.length })}
          </Badge>
        </div>
        {remaining.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {remaining.map((item) => (
              <a
                key={item.id}
                href={item.article_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full border-border/60 bg-card/80 transition hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg">
                  <CardContent className="flex h-full flex-col p-6">
                    <SourceBadge item={item} t={t} />
                    <h3 className="mt-4 line-clamp-3 text-xl font-bold leading-snug group-hover:text-primary">
                      {item.title}
                    </h3>
                    {item.summary ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {item.summary}
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-5 text-xs text-muted-foreground">
                      <time>{formatRelativeDate(item.published_at, t)}</time>
                      <ArrowUpRight className="h-4 w-4 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('empty')}
            </CardContent>
          </Card>
        )}
      </section>
      <section
        className="rounded-[2rem] border border-border/60 bg-muted/30 p-6 sm:p-8"
        aria-labelledby="newsletter-archive-heading"
      >
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">
              {newsletterT('heroChip')}
            </p>
            <h2 id="newsletter-archive-heading" className="text-3xl font-black tracking-tight">
              {newsletterT('archiveHeading')}
            </h2>
            <p className="mt-1 text-muted-foreground">{newsletterT('archiveSubheading')}</p>
          </div>
          {data.newsletters.length ? (
            <Badge>{newsletterT('archiveCount', { count: data.newsletters.length })}</Badge>
          ) : null}
        </div>
        {data.newsletters.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {data.newsletters.map((item) => (
              <Link
                key={item.slug}
                href={`/bulten/${item.slug}`}
                className="group rounded-2xl border bg-background p-5 transition hover:border-primary/35 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDate(item.sent_at, locale)}
                </div>
                <h3 className="mt-3 text-lg font-bold group-hover:text-primary">{item.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description || item.subject || newsletterT('fallbackDesc')}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">
                  {newsletterT('readIssue')}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed bg-background p-8 text-center text-muted-foreground">
            {newsletterT('emptyArchive')}
          </p>
        )}
      </section>
    </main>
  );
}
