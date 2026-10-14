import 'server-only';

import * as cheerio from 'cheerio';

import logger from '@/utils/logger';
import { createAdminClient } from '@/utils/supabase/admin';

export const AI_NEWS_SOURCES = [
  {
    id: 'openai',
    name: 'OpenAI',
    feedUrl: 'https://openai.com/news/rss.xml',
    siteUrl: 'https://openai.com/news/',
  },
  {
    id: 'google-ai',
    name: 'Google AI',
    feedUrl: 'https://blog.google/technology/ai/rss/',
    siteUrl: 'https://blog.google/technology/ai/',
  },
  {
    id: 'hugging-face',
    name: 'Hugging Face',
    feedUrl: 'https://huggingface.co/blog/feed.xml',
    siteUrl: 'https://huggingface.co/blog',
  },
  {
    id: 'microsoft-ai',
    name: 'Microsoft AI',
    feedUrl: 'https://news.microsoft.com/source/topics/ai/feed/',
    siteUrl: 'https://news.microsoft.com/source/topics/ai/',
  },
  {
    id: 'reddit-ai-community',
    name: 'Reddit AI Toplulukları',
    feedUrl: 'https://www.reddit.com/r/MachineLearning+LocalLLaMA+artificial/top/.rss?t=week',
    siteUrl: 'https://www.reddit.com/r/MachineLearning+LocalLLaMA+artificial/',
  },
];

export const X_OFFICIAL_ACCOUNTS = [
  'OpenAI',
  'AnthropicAI',
  'GoogleDeepMind',
  'huggingface',
  'MistralAI',
  'xai',
];

const MAX_ITEMS_PER_SOURCE = 12;
const MAX_SUMMARY_LENGTH = 600;

function cleanText(value = '') {
  const $ = cheerio.load(`<div>${String(value)}</div>`);
  return $('div').text().replace(/\s+/g, ' ').trim();
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function firstText($item, selectors) {
  for (const selector of selectors) {
    const value = $item.find(selector).first().text().trim();
    if (value) return value;
  }
  return '';
}

function firstAttribute($item, selectors, attribute) {
  for (const selector of selectors) {
    const value = $item.find(selector).first().attr(attribute)?.trim();
    if (value) return value;
  }
  return '';
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export function parseAiNewsFeed(xml, source, { now = new Date() } = {}) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const entries = $('item, entry').toArray();

  return entries
    .map((element) => {
      const $item = $(element);
      const title = truncate(cleanText(firstText($item, ['title'])), 500);
      const rawLink =
        firstAttribute($item, ['link[rel="alternate"]', 'link'], 'href') ||
        firstText($item, ['link', 'guid']);
      const articleUrl = safeHttpUrl(rawLink);
      const rawPublishedAt = firstText($item, ['pubDate', 'published', 'updated', 'dc\\:date']);
      const publishedAt = new Date(rawPublishedAt || now);
      const summary = truncate(
        cleanText(firstText($item, ['description', 'summary', 'content\\:encoded', 'content'])),
        MAX_SUMMARY_LENGTH
      );
      const imageUrl = safeHttpUrl(
        firstAttribute($item, ['media\\:content', 'media\\:thumbnail', 'enclosure'], 'url')
      );

      if (!title || !articleUrl || Number.isNaN(publishedAt.getTime())) return null;

      return {
        source_id: source.id,
        source_name: source.name,
        source_url: source.siteUrl,
        title,
        summary: summary || null,
        article_url: articleUrl,
        image_url: imageUrl || null,
        published_at: publishedAt.toISOString(),
        is_published: true,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_ITEMS_PER_SOURCE);
}

async function fetchSource(source, fetchImpl) {
  const response = await fetchImpl(source.feedUrl, {
    headers: {
      Accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml',
      'User-Agent': 'AIKesifNewsletterBot/1.0 (+https://aikesif.com/bulten)',
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
  return parseAiNewsFeed(await response.text(), source);
}

export function parseXSearchResponse(payload) {
  const users = new Map((payload?.includes?.users || []).map((user) => [user.id, user]));

  return (payload?.data || [])
    .map((post) => {
      const user = users.get(post.author_id);
      const username = user?.username;
      const text = cleanText(post.text);
      const publishedAt = new Date(post.created_at);

      if (!post.id || !username || !text || Number.isNaN(publishedAt.getTime())) return null;

      return {
        source_id: `x-${username.toLowerCase()}`,
        source_name: `X · ${user.name || `@${username}`}`,
        source_url: `https://x.com/${username}`,
        title: truncate(text, 220),
        summary: text.length > 220 ? truncate(text, MAX_SUMMARY_LENGTH) : null,
        article_url: `https://x.com/${username}/status/${post.id}`,
        image_url: null,
        published_at: publishedAt.toISOString(),
        is_published: true,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_ITEMS_PER_SOURCE);
}

async function fetchOfficialXPosts(fetchImpl) {
  const bearerToken = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) return { skipped: true, items: [] };

  const accountQuery = X_OFFICIAL_ACCOUNTS.map((account) => `from:${account}`).join(' OR ');
  const params = new URLSearchParams({
    query: `(${accountQuery}) -is:retweet -is:reply`,
    max_results: '50',
    'tweet.fields': 'created_at,author_id',
    expansions: 'author_id',
    'user.fields': 'name,username,verified',
  });
  const response = await fetchImpl(`https://api.x.com/2/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) throw new Error(`X resmî hesap akışı: HTTP ${response.status}`);
  return { skipped: false, items: parseXSearchResponse(await response.json()) };
}

export async function syncAiNews({ fetchImpl = fetch, supabase = createAdminClient() } = {}) {
  const results = await Promise.allSettled([
    ...AI_NEWS_SOURCES.map(async (source) => ({
      source,
      items: await fetchSource(source, fetchImpl),
    })),
    fetchOfficialXPosts(fetchImpl),
  ]);

  const items = [];
  const failures = [];
  for (const result of results) {
    if (result.status === 'fulfilled') items.push(...result.value.items);
    else
      failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
  }

  if (items.length === 0) {
    return { ok: false, imported: 0, failures, error: 'Hiçbir haber kaynağı okunamadı.' };
  }

  const { error } = await supabase
    .from('ai_news_items')
    .upsert(items, { onConflict: 'article_url', ignoreDuplicates: false });

  if (error) {
    logger.error('[ai-news] upsert failed:', error);
    return { ok: false, imported: 0, failures, error: error.message };
  }

  return {
    ok: true,
    imported: items.length,
    failures,
    xEnabled: Boolean(process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN),
  };
}

export async function getLatestAiNews({ limit = 8, supabase = createAdminClient() } = {}) {
  const { data, error } = await supabase
    .from('ai_news_items')
    .select(
      'id, source_id, source_name, source_url, title, summary, article_url, image_url, published_at'
    )
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('[ai-news] latest query failed:', error);
    return [];
  }

  return data || [];
}
