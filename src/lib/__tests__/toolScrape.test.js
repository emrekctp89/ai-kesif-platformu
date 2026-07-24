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
