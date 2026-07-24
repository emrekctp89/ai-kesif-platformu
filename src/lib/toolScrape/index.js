/**
 * Tek URL'den araç adayı üretir.
 *
 * Provider:
 * - native: fetch + cheerio
 * - jina: r.jina.ai markdown
 * - auto: native önce, ince içerikte jina fallback
 */

import { getBlockedToolHost } from '@/lib/toolLinkPolicy';
import { normalizeToolUrl } from '@/lib/toolQuality';
import {
  parseHtmlDocument,
  parseMarkdownDocument,
  toToolCandidate,
} from '@/lib/toolScrape/parsePage';
import {
  clampTimeout,
  isThinContent,
  scrapeWithJina,
  scrapeWithNative,
} from '@/lib/toolScrape/providers';

function normalizeInputUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return { error: 'URL gerekli.' };
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProtocol);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { error: 'Yalnızca http/https desteklenir.' };
    }
    const host = url.hostname.replace(/^\[|\]$/g, '');
    // "not-a-url" gibi noktasız sahte hostları ele.
    if (!host || host === 'localhost') {
      return { error: 'Geçersiz URL.' };
    }
    if (!host.includes('.') && host !== 'localhost') {
      return { error: 'Geçersiz URL.' };
    }
    return { url: url.toString() };
  } catch {
    return { error: 'Geçersiz URL.' };
  }
}

function resolveProvider(requested) {
  const value = String(requested || process.env.KASIF_SCRAPE_PROVIDER || 'auto')
    .trim()
    .toLowerCase();
  if (['native', 'jina', 'auto'].includes(value)) return value;
  return 'auto';
}

async function runProvider(provider, url, timeoutMs) {
  if (provider === 'jina') {
    return scrapeWithJina(url, { timeoutMs });
  }
  return scrapeWithNative(url, { timeoutMs });
}

function parseProviderResult(result, sourceUrl) {
  if (result.provider === 'jina') {
    return parseMarkdownDocument(result.body, result.finalUrl || sourceUrl);
  }
  const contentType = String(result.contentType || '').toLowerCase();
  if (contentType.includes('html') || /<html[\s>]/i.test(result.body || '')) {
    return parseHtmlDocument(result.body, result.finalUrl || sourceUrl);
  }
  return parseMarkdownDocument(result.body, result.finalUrl || sourceUrl);
}

/**
 * @param {string} rawUrl
 * @param {{ provider?: 'auto'|'native'|'jina', timeoutMs?: number }} [options]
 */
export async function scrapeToolPage(rawUrl, options = {}) {
  const normalized = normalizeInputUrl(rawUrl);
  if (normalized.error) {
    return { ok: false, error: normalized.error };
  }

  const url = normalized.url;
  if (getBlockedToolHost(url)) {
    return { ok: false, error: 'Dizin/aggregator bağlantısı scrape edilemez.' };
  }

  const providerMode = resolveProvider(options.provider);
  const timeoutMs = clampTimeout(options.timeoutMs || process.env.KASIF_SCRAPE_TIMEOUT_MS);
  const warnings = [];
  const attempts = [];

  const chain =
    providerMode === 'auto' ? ['native', 'jina'] : providerMode === 'jina' ? ['jina'] : ['native'];

  let lastError = null;
  let chosen = null;
  let parsed = null;

  for (const provider of chain) {
    try {
      const result = await runProvider(provider, url, timeoutMs);
      attempts.push({
        provider,
        ok: result.ok,
        httpStatus: result.httpStatus,
        bodyLength: String(result.body || '').length,
      });

      if (!result.ok && provider === 'native' && chain.includes('jina')) {
        warnings.push(`native HTTP ${result.httpStatus}; jina deneniyor.`);
        lastError = `native HTTP ${result.httpStatus}`;
        continue;
      }

      if (!result.ok) {
        lastError = `${provider} HTTP ${result.httpStatus}`;
        continue;
      }

      const nextParsed = parseProviderResult(result, url);
      const thin = isThinContent(nextParsed);
      attempts[attempts.length - 1].thin = thin;
      attempts[attempts.length - 1].name = nextParsed.name;
      attempts[attempts.length - 1].descriptionLength = String(nextParsed.description || '').length;

      if (thin && provider === 'native' && chain.includes('jina')) {
        warnings.push('native içerik yetersiz; jina fallback.');
        parsed = nextParsed;
        chosen = result;
        continue;
      }

      parsed = nextParsed;
      chosen = result;
      if (!thin) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      attempts.push({ provider, ok: false, error: lastError });
      if (provider === 'native' && chain.includes('jina')) {
        warnings.push(`native hata: ${lastError}; jina deneniyor.`);
        continue;
      }
    }
  }

  if (!parsed || !chosen) {
    return {
      ok: false,
      error: lastError || 'Sayfa içeriği alınamadı.',
      attempts,
      warnings,
    };
  }

  const candidate = toToolCandidate(parsed, {
    provider: chosen.provider,
    sourceUrl: url,
  });

  // normalizeToolUrl may still return null for odd hosts
  if (!normalizeToolUrl(candidate.link)) {
    return { ok: false, error: 'Aday bağlantısı geçersiz.', attempts, warnings };
  }

  if (getBlockedToolHost(candidate.link)) {
    return { ok: false, error: 'Hedef host engelli.', attempts, warnings };
  }

  const quality = {
    nameLength: candidate.name.length,
    descriptionLength: candidate.description.length,
    featureCount: candidate.features.length,
    thin: isThinContent(parsed),
  };

  return {
    ok: true,
    provider: chosen.provider,
    httpStatus: chosen.httpStatus,
    finalUrl: chosen.finalUrl || candidate.link,
    candidate,
    meta: parsed.meta || {},
    quality,
    warnings,
    attempts,
    scrapedAt: new Date().toISOString(),
  };
}

export {
  parseHtmlDocument,
  parseMarkdownDocument,
  toToolCandidate,
} from '@/lib/toolScrape/parsePage';

export { enrichScrapeCandidate, mergeEnrichedCandidate } from '@/lib/toolScrape/enrichCandidate';

export {
  parseBulkUrls,
  clampBulkLimit,
  DEFAULT_BULK_LIMIT,
  MAX_BULK_LIMIT,
} from '@/lib/toolScrape/bulk';
