/**
 * Scrape provider'ları: native fetch+cheerio ve Jina Reader.
 */

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const USER_AGENT = 'AIKesifToolScrape/1.0 (+https://aikesif.com)';

function isPrivateIpv4(hostname) {
  const parts = hostname.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    host === '::' ||
    host === '::1' ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    /^fe[89ab]/.test(host) ||
    host.startsWith('::ffff:127.') ||
    host.startsWith('::ffff:10.') ||
    host.startsWith('::ffff:192.168.') ||
    /^::ffff:172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

export function assertSafeScrapeUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Geçersiz scrape URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Yalnızca http/https scrape edilebilir.');
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    isPrivateIpv4(hostname) ||
    (hostname.includes(':') && isPrivateIpv6(hostname))
  ) {
    throw new Error('Özel veya yerel ağ adresleri scrape edilemez.');
  }
  return parsed.toString();
}

function clampMaxResponseBytes(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isInteger(parsed)) return DEFAULT_MAX_RESPONSE_BYTES;
  return Math.min(5 * 1024 * 1024, Math.max(64 * 1024, parsed));
}

async function readBoundedText(response, maxBytes) {
  const declared = Number.parseInt(response.headers.get('content-length') || '', 10);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`Scrape yanıtı çok büyük (${declared} bayt).`);
  }
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    throw new Error(`Scrape yanıtı ${maxBytes} bayt sınırını aşıyor.`);
  }
  return text;
}

export function clampTimeout(value) {
  const n = Number.parseInt(String(value || ''), 10);
  if (!Number.isInteger(n)) return DEFAULT_TIMEOUT_MS;
  return Math.min(20000, Math.max(3000, n));
}

export async function scrapeWithNative(url, { timeoutMs, maxResponseBytes } = {}) {
  const timeout = clampTimeout(timeoutMs);
  const maxBytes = clampMaxResponseBytes(
    maxResponseBytes || process.env.KASIF_SCRAPE_MAX_RESPONSE_BYTES
  );
  let target = assertSafeScrapeUrl(url);
  let response;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    response = await fetch(target, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(timeout),
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'cache-control': 'no-cache',
      },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    if (redirects === MAX_REDIRECTS) throw new Error('Çok fazla scrape yönlendirmesi.');
    const location = response.headers.get('location');
    if (!location) throw new Error('Scrape yönlendirmesinde hedef yok.');
    target = assertSafeScrapeUrl(new URL(location, target).toString());
  }

  const html = await readBoundedText(response, maxBytes);
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
export async function scrapeWithJina(url, { timeoutMs, apiKey, maxResponseBytes } = {}) {
  const timeout = clampTimeout(timeoutMs);
  const safeUrl = assertSafeScrapeUrl(url);
  const target = `https://r.jina.ai/${safeUrl}`;
  const maxBytes = clampMaxResponseBytes(
    maxResponseBytes || process.env.KASIF_SCRAPE_MAX_RESPONSE_BYTES
  );
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

  const body = await readBoundedText(response, maxBytes);
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

export { DEFAULT_MAX_RESPONSE_BYTES, MAX_REDIRECTS };
