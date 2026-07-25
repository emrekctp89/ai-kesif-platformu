/**
 * Zamanlanmış seed scrape orkestrasyonu.
 *
 * Bu katman yalnızca aday üretir; doğrudan tools tablosuna yazmaz. Böylece
 * zamanlanmış dış ağ çağrıları admin onay kapısını hiçbir zaman atlayamaz.
 */

import { buildScrapeQueue, clampQueueLimit } from '@/lib/toolScrape/queue';

const DEFAULT_QUOTA = 5;
const MAX_QUOTA = 10;
const DEFAULT_RETRIES = 1;
const MAX_RETRIES = 2;

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function clampScrapeQuota(value) {
  return clampInteger(value, DEFAULT_QUOTA, 1, MAX_QUOTA);
}

export function clampScrapeRetries(value) {
  return clampInteger(value, DEFAULT_RETRIES, 0, MAX_RETRIES);
}

export function isRetryableScrapeFailure(result) {
  if (!result || result.ok) return false;
  const attempts = Array.isArray(result.attempts) ? result.attempts : [];
  if (attempts.some((attempt) => attempt?.httpStatus === 429 || attempt?.httpStatus >= 500)) {
    return true;
  }
  const detail = [result.error, ...attempts.map((attempt) => attempt?.error)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /timeout|timed out|abort|network|fetch failed|econnreset|enotfound/.test(detail);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeWithRetry(job, options) {
  const attempts = [];
  let providerAttempts = 0;
  const maxAttempts = options.retries + 1;

  for (let index = 0; index < maxAttempts; index += 1) {
    const result = await options.scrape(job.url, {
      provider: options.provider,
      timeoutMs: options.timeoutMs,
    });
    attempts.push(result);
    providerAttempts += (result?.attempts || []).length || 1;
    if (result.ok || !isRetryableScrapeFailure(result) || index === maxAttempts - 1) {
      return { result, retryCount: index, runs: attempts.length, providerAttempts };
    }
    await options.delay(Math.min(2000, 400 * 2 ** index));
  }

  return {
    result: attempts.at(-1),
    retryCount: attempts.length - 1,
    runs: attempts.length,
    providerAttempts,
  };
}

/**
 * @param {{
 *   catalogTools?: Array<object>,
 *   categorySlug?: string,
 *   limit?: number,
 *   quota?: number,
 *   retries?: number,
 *   provider?: 'auto'|'native'|'jina',
 *   timeoutMs?: number,
 *   scrape?: (url: string, options?: object) => Promise<object>,
 *   delay?: (ms: number) => Promise<void>,
 * }} [options]
 */
export async function runScheduledScrapeQueue(options = {}) {
  const quota = clampScrapeQuota(options.quota);
  const limit = Math.min(clampQueueLimit(options.limit), quota);
  const retries = clampScrapeRetries(options.retries);
  const provider = ['auto', 'native', 'jina'].includes(options.provider)
    ? options.provider
    : 'auto';
  const built = buildScrapeQueue({
    categorySlug: options.categorySlug || 'all',
    catalogTools: options.catalogTools || [],
    limit,
    includeGeneral: true,
  });
  const scrape = options.scrape || (await import('@/lib/toolScrape/index')).scrapeToolPage;
  const delay = options.delay || wait;
  const results = [];
  let providerAttempts = 0;
  let retryCount = 0;

  for (const job of built.queue.slice(0, quota)) {
    try {
      const execution = await scrapeWithRetry(job, {
        retries,
        provider,
        timeoutMs: options.timeoutMs,
        scrape,
        delay,
      });
      providerAttempts += execution.providerAttempts;
      retryCount += execution.retryCount;
      results.push({
        url: job.url,
        seedName: job.name,
        categorySlug: job.categorySlug,
        ok: Boolean(execution.result?.ok),
        error: execution.result?.ok ? null : execution.result?.error || 'Scrape başarısız.',
        provider: execution.result?.provider || null,
        candidate: execution.result?.ok ? execution.result.candidate : null,
        warnings: execution.result?.warnings || [],
        retryCount: execution.retryCount,
      });
    } catch (error) {
      providerAttempts += 1;
      results.push({
        url: job.url,
        seedName: job.name,
        categorySlug: job.categorySlug,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        provider: null,
        candidate: null,
        warnings: [],
        retryCount: 0,
      });
    }
  }

  const candidates = results.filter((item) => item.ok && item.candidate);
  const failures = results.filter((item) => !item.ok);
  return {
    categorySlug: built.categorySlug,
    provider,
    quota: {
      limit: quota,
      used: results.length,
      remaining: Math.max(0, quota - results.length),
      providerAttempts,
    },
    seedCount: built.seedCount,
    queueCount: built.queue.length,
    processedCount: results.length,
    candidateCount: candidates.length,
    failureCount: failures.length,
    retryCount,
    candidates: candidates.map((item) => ({
      name: item.candidate.name,
      link: item.candidate.link,
      description: item.candidate.description,
      categorySlug: item.categorySlug,
      provider: item.provider,
      warnings: item.warnings,
    })),
    failures: failures.map(({ url, seedName, categorySlug, error, retryCount: itemRetries }) => ({
      url,
      seedName,
      categorySlug,
      error,
      retryCount: itemRetries,
    })),
    skippedPrefilter: built.skipped,
    results,
    completedAt: new Date().toISOString(),
  };
}

export { DEFAULT_QUOTA, MAX_QUOTA, DEFAULT_RETRIES, MAX_RETRIES };
