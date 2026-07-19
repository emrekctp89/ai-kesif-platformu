/**
 * @jest-environment node
 */

describe('seo utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://example.com',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  async function loadSeo() {
    return import('../seo');
  }

  it('builds locale paths without double-prefixing /en', async () => {
    const { buildLocalePath, stripLocalePrefix } = await loadSeo();

    expect(buildLocalePath('/karsilastir', 'tr')).toBe('/karsilastir');
    expect(buildLocalePath('/karsilastir', 'en')).toBe('/en/karsilastir');
    expect(buildLocalePath('/en/karsilastir', 'en')).toBe('/en/karsilastir');
    expect(buildLocalePath('/', 'en')).toBe('/en');
    expect(stripLocalePrefix('/en/tool/foo')).toBe('/tool/foo');
    expect(stripLocalePrefix('/en')).toBe('/');
  });

  it('infers English locale from path for hreflang alternates', async () => {
    const { generatePageMetadata } = await loadSeo();
    const meta = generatePageMetadata({
      title: 'Compare',
      description: 'Compare tools',
      path: '/en/karsilastir',
    });

    expect(meta.alternates.canonical).toBe('https://example.com/en/karsilastir');
    expect(meta.alternates.languages.tr).toBe('https://example.com/karsilastir');
    expect(meta.alternates.languages.en).toBe('https://example.com/en/karsilastir');
    expect(meta.openGraph.locale).toBe('en_US');
  });

  it('omits incomplete aggregateRating on SoftwareApplication', async () => {
    const { generateStructuredData } = await loadSeo();
    const schema = generateStructuredData('SoftwareApplication', {
      name: 'Demo AI',
      description: 'A demo tool',
      rating: 4.5,
      // reviewCount missing → no aggregateRating
    });

    expect(schema['@type']).toBe('SoftwareApplication');
    expect(schema.aggregateRating).toBeUndefined();
  });

  it('includes aggregateRating only with valid rating + count', async () => {
    const { generateStructuredData } = await loadSeo();
    const schema = generateStructuredData('Product', {
      name: 'Demo AI',
      description: 'A demo tool',
      rating: 4.567,
      reviewCount: 12,
      minPrice: 0,
    });

    expect(schema.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.57,
      reviewCount: 12,
      bestRating: 5,
      worstRating: 1,
    });
    expect(schema.offers).toBeDefined();
  });

  it('builds FAQ and ItemList schemas', async () => {
    const { generateStructuredData, safeJsonLd } = await loadSeo();
    const faq = generateStructuredData('FAQPage', {
      faqs: [{ question: 'What is AI Keşif?', answer: 'An AI tools directory.' }],
    });
    const list = generateStructuredData('ItemList', {
      name: 'A vs B',
      items: [
        { name: 'A', url: '/tool/a' },
        { name: 'B', url: '/tool/b' },
      ],
    });

    expect(faq.mainEntity).toHaveLength(1);
    expect(list.numberOfItems).toBe(2);
    expect(safeJsonLd({ html: '<script>' })).toContain('\\u003c');
  });

  it('generates breadcrumb absolute URLs', async () => {
    const { generateStructuredData } = await loadSeo();
    const crumbs = generateStructuredData('BreadcrumbList', [
      { name: 'Home', url: '/' },
      { name: 'Discover', path: '/kesfet' },
    ]);

    expect(crumbs.itemListElement[0].item).toBe('https://example.com/');
    expect(crumbs.itemListElement[1].item).toBe('https://example.com/kesfet');
  });
});
