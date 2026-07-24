/**
 * @jest-environment node
 */

jest.mock('server-only', () => ({}));

const {
  parseHtmlDocument,
  parseMarkdownDocument,
  toToolCandidate,
} = require('../toolScrape/parsePage');
const { scrapeToolPage } = require('../toolScrape');
const { parseBulkUrls, clampBulkLimit } = require('../toolScrape/bulk');
const { mergeEnrichedCandidate } = require('../toolScrape/enrichCandidate');

describe('toolScrape parsePage', () => {
  it('HTML og etiketlerinden aday alanları çıkarır', () => {
    const html = `
      <html>
        <head>
          <title>Other Title</title>
          <meta property="og:title" content="Acme AI" />
          <meta property="og:description" content="Acme AI is a powerful writing assistant for marketing teams and creators worldwide." />
          <meta property="og:url" content="https://acme.ai/" />
          <link rel="canonical" href="https://acme.ai/" />
        </head>
        <body>
          <h1>Acme AI</h1>
          <ul>
            <li>Generate on-brand blog drafts in seconds</li>
            <li>Collaborate with your content team live</li>
            <li>Export to CMS with one click</li>
          </ul>
        </body>
      </html>
    `;

    const parsed = parseHtmlDocument(html, 'https://acme.ai/pricing');
    expect(parsed.name).toBe('Acme AI');
    expect(parsed.description).toMatch(/writing assistant/i);
    expect(parsed.link).toMatch(/acme\.ai/);
    expect(parsed.features.length).toBeGreaterThanOrEqual(2);

    const candidate = toToolCandidate(parsed, {
      provider: 'native',
      sourceUrl: 'https://acme.ai/pricing',
    });
    expect(candidate.name).toBe('Acme AI');
    expect(candidate.description.length).toBeGreaterThanOrEqual(60);
    expect(candidate.features.length).toBeGreaterThanOrEqual(2);
    expect(candidate.source_reason).toMatch(/native/i);
  });

  it('markdown/jina çıktısından başlık ve gövde çıkarır', () => {
    const md = `
Title: Notion AI

URL Source: https://www.notion.so/product/ai

# Notion AI

Notion AI helps you write, summarize, and brainstorm inside your workspace pages.
It supports drafts, action items, and translation for teams.
`;
    const parsed = parseMarkdownDocument(md, 'https://www.notion.so/product/ai');
    expect(parsed.name).toMatch(/Notion AI/i);
    expect(parsed.description).toMatch(/write|summarize|brainstorm/i);
  });
});

describe('scrapeToolPage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('engelli hostu reddeder', async () => {
    const result = await scrapeToolPage('https://topai.tools/some-tool');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/scrape|dizin|aggregator/i);
  });

  it('geçersiz URL reddeder', async () => {
    const result = await scrapeToolPage('not-a-url');
    expect(result.ok).toBe(false);
  });

  it('native provider ile aday üretir', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://example-product.com/',
      headers: { get: () => 'text/html; charset=utf-8' },
      text: async () => `
        <html><head>
          <meta property="og:title" content="Example Product" />
          <meta property="og:description" content="Example Product is an AI productivity suite for modern teams shipping faster every week." />
        </head><body>
          <h1>Example Product</h1>
          <ul>
            <li>Automate recurring research workflows</li>
            <li>Share insights with stakeholders quickly</li>
          </ul>
        </body></html>
      `,
    });

    const result = await scrapeToolPage('https://example-product.com', { provider: 'native' });
    expect(result.ok).toBe(true);
    expect(result.provider).toBe('native');
    expect(result.candidate.name).toBe('Example Product');
    expect(result.candidate.link).toMatch(/example-product\.com/);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('native ince içerikte jina fallback dener', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://thin.example/',
        headers: { get: () => 'text/html' },
        text: async () => '<html><head><title>X</title></head><body></body></html>',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://r.jina.ai/https://thin.example/',
        headers: { get: () => 'text/plain' },
        text: async () =>
          '# Thin AI\n\nThin AI helps product teams document decisions with AI summaries and action items for weekly planning rituals.',
      });

    const result = await scrapeToolPage('https://thin.example/', { provider: 'auto' });
    expect(result.ok).toBe(true);
    expect(result.provider).toBe('jina');
    expect(result.candidate.name).toMatch(/Thin AI/i);
    expect(result.warnings?.join(' ')).toMatch(/jina/i);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('toolScrape bulk', () => {
  it('satır ve virgülden URL listesi çıkarır, tekrarı atar', () => {
    const parsed = parseBulkUrls(
      'https://a.example\nhttps://b.example, https://a.example\nc.example',
      { limit: 10 }
    );
    expect(parsed.totalFound).toBe(3);
    expect(parsed.urls).toHaveLength(3);
    expect(parsed.urls[0]).toMatch(/a\.example/);
    expect(parsed.urls[2]).toMatch(/^https:\/\/c\.example/);
    expect(parsed.truncated).toBe(false);
  });

  it('limit üstünü keser', () => {
    const parsed = parseBulkUrls(
      ['https://1.example', 'https://2.example', 'https://3.example', 'https://4.example'],
      { limit: 2 }
    );
    expect(parsed.urls).toHaveLength(2);
    expect(parsed.truncated).toBe(true);
    expect(parsed.totalFound).toBe(4);
  });

  it('clampBulkLimit sınırları uygular', () => {
    expect(clampBulkLimit(0)).toBe(1);
    expect(clampBulkLimit(99)).toBe(15);
    expect(clampBulkLimit('x')).toBe(5);
  });
});

describe('toolScrape enrich merge', () => {
  it('Gemini alanlarını aday üzerine güvenli birleştirir', () => {
    const base = {
      name: 'Acme AI',
      link: 'https://acme.ai/',
      description: 'Short EN desc about Acme AI writing tools for teams.',
      pricing_model: 'Freemium',
      platforms: ['Web'],
      features: ['Feature A'],
      use_cases: ['Draft blogs'],
      source_reason: 'URL scrape (native): https://acme.ai/',
    };

    const merged = mergeEnrichedCandidate(base, {
      description:
        'Acme AI, pazarlama ekipleri için Türkçe ve İngilizce içerik taslakları üreten bir yazı asistanıdır. Ekip iş birliği ve CMS aktarımı sunar.',
      pricing_model: 'Abonelik',
      platforms: ['Web', 'Chrome Uzantısı'],
      features: [
        'Marka sesine uygun blog taslağı',
        'Canlı ekip düzenleme',
        'Tek tıkla CMS aktarımı',
      ],
      use_cases: ['Pazarlama içerikleri', 'Sosyal medya taslakları', 'Ürün duyuruları'],
      target_users: ['İçerik ekipleri', 'Pazarlamacılar'],
      limitations: ['Kurumsal plan gerekir'],
    });

    expect(merged.description).toMatch(/yazı asistanıdır/i);
    expect(merged.pricing_model).toBe('Abonelik');
    expect(merged.platforms).toEqual(expect.arrayContaining(['Web', 'Chrome Uzantısı']));
    expect(merged.features.length).toBeGreaterThanOrEqual(3);
    expect(merged.use_cases.length).toBeGreaterThanOrEqual(2);
    expect(merged.target_users).toContain('İçerik ekipleri');
    expect(merged.enriched).toBe(true);
    expect(merged.source_reason).toMatch(/Gemini enrich/i);
  });

  it('çok kısa Gemini açıklamasını yok sayar', () => {
    const base = {
      name: 'Keep Me',
      link: 'https://keep.example/',
      description:
        'Keep Me is a solid product description that should remain when enrichment is too short for quality.',
      features: ['One', 'Two'],
      use_cases: ['A', 'B'],
      source_reason: 'URL scrape',
    };
    const merged = mergeEnrichedCandidate(base, {
      description: 'çok kısa',
      features: ['Yeni özellik bir', 'Yeni özellik iki', 'Yeni özellik üç'],
    });
    expect(merged.description).toBe(base.description);
    expect(merged.features.length).toBeGreaterThanOrEqual(2);
  });
});
