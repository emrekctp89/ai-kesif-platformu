/**
 * @jest-environment node
 */

const {
  parsePositiveIntegerParam,
  jsonResponse,
  rateLimitHeaders,
  rateLimitResponse,
  normalizeToolSlug,
  formatToolForApi,
  V1_RATE_LIMIT_PER_MINUTE,
} = require('../../src/lib/developerApi');

describe('developerApi helpers', () => {
  it('parsePositiveIntegerParam fallback ve clamp yapar', () => {
    expect(parsePositiveIntegerParam(null, 50)).toBe(50);
    expect(parsePositiveIntegerParam('abc', 50)).toBe(50);
    expect(parsePositiveIntegerParam('-5', 1)).toBe(1);
    expect(parsePositiveIntegerParam('500', 50, { max: 100 })).toBe(100);
    expect(parsePositiveIntegerParam('25', 50, { max: 100 })).toBe(25);
  });

  it('jsonResponse JSON body ve status üretir', async () => {
    const res = jsonResponse({ ok: true }, 201, { 'X-Test': '1' });
    expect(res.status).toBe(201);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('X-Test')).toBe('1');
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('rateLimitHeaders ve limit sabiti tutarlı', () => {
    expect(V1_RATE_LIMIT_PER_MINUTE).toBe(30);
    expect(rateLimitHeaders({ limit: 30, remaining: 12, reset: 1 })).toEqual({
      'X-RateLimit-Limit': '30',
      'X-RateLimit-Remaining': '12',
    });
  });

  it('rateLimitResponse 429 ve Retry-After döner', async () => {
    const res = rateLimitResponse({ limit: 30, remaining: 0, reset: Date.now() + 15000 });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    const body = await res.json();
    expect(body.retryAfter).toBeGreaterThan(0);
  });

  it('normalizeToolSlug geçerli slugları normalize eder', () => {
    expect(normalizeToolSlug('ChatGPT')).toBe('chatgpt');
    expect(normalizeToolSlug(' mid-journey ')).toBe('mid-journey');
    expect(normalizeToolSlug('../etc')).toBeNull();
    expect(normalizeToolSlug('a b')).toBeNull();
    expect(normalizeToolSlug('')).toBeNull();
  });

  it('formatToolForApi kategori düzleştirir ve detail alanları ekler', () => {
    const row = {
      id: 1,
      name: 'ChatGPT',
      slug: 'chatgpt',
      description: 'Assistant',
      website_url: 'https://example.com',
      pricing_type: 'freemium',
      is_verified: true,
      created_at: '2026-01-01',
      updated_at: '2026-02-01',
      category: { name: 'Chatbots', slug: 'chatbots' },
    };
    expect(formatToolForApi(row)).toMatchObject({
      name: 'ChatGPT',
      category: 'Chatbots',
      category_slug: 'chatbots',
      is_verified: true,
    });
    expect(formatToolForApi(row, { detail: true })).toMatchObject({
      updated_at: '2026-02-01',
      url: '/tool/chatgpt',
    });
  });
});
