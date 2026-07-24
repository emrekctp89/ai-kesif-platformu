/**
 * Scrape provider'ları: native fetch+cheerio ve Jina Reader.
 */

const DEFAULT_TIMEOUT_MS = 10000;
const USER_AGENT = 'AIKesifToolScrape/1.0 (+https://aikesif.com)';

export function clampTimeout(value) {
  const n = Number.parseInt(String(value || ''), 10);
  if (!Number.isInteger(n)) return DEFAULT_TIMEOUT_MS;
  return Math.min(20000, Math.max(3000, n));
}

export async function scrapeWithNative(url, { timeoutMs } = {}) {
  const timeout = clampTimeout(timeoutMs);
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(timeout),
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'cache-control': 'no-cache',
    },
  });

  const html = await response.text();
  return {
    provider: 'native',
    ok: response.ok,
    httpStatus: response.status,
    finalUrl: response.url || url,
    contentType: response.headers.get('content-type') || '',
    body: html,
  };
}

/**
 * Jina Reader: https://r.jina.ai/{url}
 * Ücretsiz / düşük maliyetli markdown çıkarımı.
 */
export async function scrapeWithJina(url, { timeoutMs, apiKey } = {}) {
  const timeout = clampTimeout(timeoutMs);
  const target = `https://r.jina.ai/${url}`;
  const headers = {
    'user-agent': USER_AGENT,
    accept: 'text/plain,text/markdown,*/*',
    'x-respond-with': 'markdown',
  };
  const key = apiKey || process.env.JINA_API_KEY;
  if (key) headers.authorization = `Bearer ${key}`;

  const response = await fetch(target, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(timeout),
    headers,
  });

  const body = await response.text();
  return {
    provider: 'jina',
    ok: response.ok,
    httpStatus: response.status,
    finalUrl: url,
    contentType: response.headers.get('content-type') || '',
    body,
  };
}

export function isThinContent({ name, description }) {
  const n = String(name || '').trim();
  const d = String(description || '').trim();
  return n.length < 2 || d.length < 40;
}
