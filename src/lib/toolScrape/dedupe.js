/**
 * Scrape aday / seed kuyruğu için host + isim dedupe.
 */

import { normalizeToolUrl } from '@/lib/toolQuality';

/**
 * @param {string} link
 * @returns {string} www.sız hostname veya ''
 */
export function extractHostKey(link) {
  const normalized = normalizeToolUrl(link) || String(link || '').trim();
  if (!normalized) return '';
  try {
    const withProtocol = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
    return new URL(withProtocol).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Karşılaştırma için isim anahtarı (TR locale, noktalama/boşluk temiz).
 * @param {string} name
 */
export function normalizeNameKey(name) {
  // tr-TR "I"→"ı" ürün adlarında (AI, GitHub) yanlış eşleşmeye yol açmasın.
  return String(name || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9gusioc]+/gi, '')
    .trim();
}

/**
 * Katalog kayıtlarından host/name/link indeksi.
 * @param {Array<{ id?: string|number, name?: string, link?: string, slug?: string, is_approved?: boolean }>} tools
 */
export function buildCatalogDedupeIndex(tools = []) {
  /** @type {Map<string, object[]>} */
  const byHost = new Map();
  /** @type {Map<string, object[]>} */
  const byName = new Map();
  /** @type {Map<string, object[]>} */
  const byLink = new Map();

  for (const tool of tools || []) {
    if (!tool) continue;
    const host = extractHostKey(tool.link);
    const nameKey = normalizeNameKey(tool.name);
    const linkKey = (normalizeToolUrl(tool.link) || String(tool.link || '').trim()).toLowerCase();

    if (host) {
      const list = byHost.get(host) || [];
      list.push(tool);
      byHost.set(host, list);
    }
    if (nameKey) {
      const list = byName.get(nameKey) || [];
      list.push(tool);
      byName.set(nameKey, list);
    }
    if (linkKey) {
      const list = byLink.get(linkKey) || [];
      list.push(tool);
      byLink.set(linkKey, list);
    }
  }

  return { byHost, byName, byLink };
}

/**
 * Adayın katalogda host veya isim çakışması var mı?
 * @param {{ name?: string, link?: string }} candidate
 * @param {ReturnType<typeof buildCatalogDedupeIndex>} index
 */
export function findCatalogDuplicates(candidate, index) {
  const host = extractHostKey(candidate?.link);
  const nameKey = normalizeNameKey(candidate?.name);
  const linkKey = (
    normalizeToolUrl(candidate?.link) || String(candidate?.link || '').trim()
  ).toLowerCase();

  const byHost = host && index?.byHost ? index.byHost.get(host) || [] : [];
  const byName = nameKey && index?.byName ? index.byName.get(nameKey) || [] : [];
  const byLink = linkKey && index?.byLink ? index.byLink.get(linkKey) || [] : [];

  const isDuplicate = byHost.length > 0 || byName.length > 0 || byLink.length > 0;

  return {
    host,
    nameKey,
    linkKey,
    byHost: byHost.slice(0, 5),
    byName: byName.slice(0, 5),
    byLink: byLink.slice(0, 5),
    isDuplicate,
    reasons: [
      byLink.length > 0 ? 'link' : null,
      byHost.length > 0 ? 'host' : null,
      byName.length > 0 ? 'name' : null,
    ].filter(Boolean),
  };
}

/**
 * Seed URL listesinden host tekrarı olanları ayıklar (katalog + kuyruk içi).
 * @param {Array<{ url: string, name?: string, categorySlug?: string }>} seeds
 * @param {ReturnType<typeof buildCatalogDedupeIndex>} index
 * @param {{ limit?: number }} [options]
 */
export function filterSeedsAgainstCatalog(seeds, index, options = {}) {
  const limit = Math.max(1, Number.parseInt(String(options.limit || 20), 10) || 20);
  const queue = [];
  const skipped = [];
  const seenHosts = new Set();
  const seenNames = new Set();

  for (const seed of seeds || []) {
    const url = String(seed?.url || '').trim();
    if (!url) continue;

    const host = extractHostKey(url);
    const nameKey = normalizeNameKey(seed?.name || host);

    if (host && seenHosts.has(host)) {
      skipped.push({ url, reason: 'queue-host-dup', host });
      continue;
    }
    if (nameKey && seenNames.has(nameKey)) {
      skipped.push({ url, reason: 'queue-name-dup', nameKey });
      continue;
    }

    const probe = { name: seed?.name || host, link: url };
    const dup = findCatalogDuplicates(probe, index);
    if (dup.isDuplicate) {
      skipped.push({
        url,
        reason: `catalog-${dup.reasons.join('+') || 'dup'}`,
        host: dup.host,
        nameKey: dup.nameKey,
        matches: {
          byHost: dup.byHost.map((t) => t.name || t.slug).slice(0, 3),
          byName: dup.byName.map((t) => t.name || t.slug).slice(0, 3),
        },
      });
      continue;
    }

    if (host) seenHosts.add(host);
    if (nameKey) seenNames.add(nameKey);

    queue.push({
      url,
      name: seed?.name || null,
      categorySlug: seed?.categorySlug || null,
      host,
    });

    if (queue.length >= limit) break;
  }

  return {
    queue,
    skipped,
    truncated: (seeds || []).length > queue.length + skipped.length,
  };
}
