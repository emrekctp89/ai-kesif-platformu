/**
 * Kategori bazlı scrape kuyruğu: seed listesi + katalog dedupe.
 */

import {
  buildCatalogDedupeIndex,
  filterSeedsAgainstCatalog,
  findCatalogDuplicates,
} from '@/lib/toolScrape/dedupe';
import {
  getSeedEntries,
  listSeedCategorySlugs,
  summarizeSeedCatalog,
} from '@/lib/toolScrape/seedUrls';
import { clampBulkLimit } from '@/lib/toolScrape/bulk';

const DEFAULT_QUEUE_LIMIT = 5;
const MAX_QUEUE_LIMIT = 10;

export function clampQueueLimit(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return DEFAULT_QUEUE_LIMIT;
  return Math.min(MAX_QUEUE_LIMIT, Math.max(1, parsed));
}

/**
 * Seed + katalog → scrape edilecek URL kuyruğu.
 *
 * @param {{
 *   categorySlug?: string,
 *   catalogTools?: Array<object>,
 *   limit?: number,
 *   includeGeneral?: boolean,
 *   extraSeeds?: Array<{ url: string, name?: string, categorySlug?: string }>,
 * }} [options]
 */
export function buildScrapeQueue(options = {}) {
  const limit = clampQueueLimit(options.limit);
  const categorySlug =
    String(options.categorySlug || '')
      .trim()
      .toLowerCase() || 'all';
  const seeds = [
    ...getSeedEntries(categorySlug, { includeGeneral: options.includeGeneral !== false }),
    ...(Array.isArray(options.extraSeeds) ? options.extraSeeds : []),
  ];

  const index = buildCatalogDedupeIndex(options.catalogTools || []);
  const filtered = filterSeedsAgainstCatalog(seeds, index, { limit });

  return {
    categorySlug,
    limit,
    seedCount: seeds.length,
    queue: filtered.queue,
    skipped: filtered.skipped,
    availableCategories: listSeedCategorySlugs(),
    summary: summarizeSeedCatalog(),
  };
}

/**
 * Scrape sonrası aday için katalog + kuyruk-içi host/name kontrolü.
 * @param {object} candidate
 * @param {ReturnType<typeof buildCatalogDedupeIndex>} index
 * @param {{ seenHosts?: Set<string>, seenNames?: Set<string> }} [session]
 */
export function checkCandidateDedupe(candidate, index, session = {}) {
  const dup = findCatalogDuplicates(candidate, index);
  const host = dup.host;
  const nameKey = dup.nameKey;
  const sessionReasons = [];

  if (host && session.seenHosts?.has(host)) sessionReasons.push('batch-host');
  if (nameKey && session.seenNames?.has(nameKey)) sessionReasons.push('batch-name');

  const isDuplicate = dup.isDuplicate || sessionReasons.length > 0;

  return {
    ...dup,
    isDuplicate,
    reasons: [...dup.reasons, ...sessionReasons],
  };
}

export { DEFAULT_QUEUE_LIMIT, MAX_QUEUE_LIMIT };
