/**
 * Toplu URL scrape yardımcıları (saf parse + limit).
 */

const DEFAULT_BULK_LIMIT = 5;
const MAX_BULK_LIMIT = 15;

/**
 * Metin / dizi / satır listesinden URL listesi çıkarır.
 * @param {string|string[]} raw
 * @param {{ limit?: number }} [options]
 * @returns {{ urls: string[], truncated: boolean, totalFound: number }}
 */
export function parseBulkUrls(raw, options = {}) {
  const limit = clampBulkLimit(options.limit);
  let items = [];

  if (Array.isArray(raw)) {
    items = raw.map((item) => String(item || '').trim()).filter(Boolean);
  } else {
    items = String(raw || '')
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const seen = new Set();
  const urls = [];
  for (const item of items) {
    const withProtocol = /^https?:\/\//i.test(item) ? item : `https://${item}`;
    let key = withProtocol;
    try {
      const url = new URL(withProtocol);
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      key = url.toString();
    } catch {
      // Geçersiz URL'leri de listede bırak; scrape katmanı hata döner
      key = withProtocol;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(key);
  }

  const totalFound = urls.length;
  const truncated = totalFound > limit;
  return {
    urls: urls.slice(0, limit),
    truncated,
    totalFound,
  };
}

export function clampBulkLimit(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return DEFAULT_BULK_LIMIT;
  return Math.min(MAX_BULK_LIMIT, Math.max(1, parsed));
}

export { DEFAULT_BULK_LIMIT, MAX_BULK_LIMIT };
