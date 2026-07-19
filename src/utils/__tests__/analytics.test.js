/**
 * @jest-environment jsdom
 */

describe('analytics utilities', () => {
  beforeEach(() => {
    jest.resetModules();
    window.dataLayer = [];
    delete window.gtag;
  });

  async function loadAnalytics() {
    return import('../analytics');
  }

  it('pushes cleaned events to dataLayer when gtag is absent', async () => {
    const { trackEvent } = await loadAnalytics();
    trackEvent('tool_view', {
      tool_slug: 'chatgpt',
      nested: { a: 1 },
      empty: null,
      flag: true,
    });

    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer[0]).toEqual({
      event: 'tool_view',
      tool_slug: 'chatgpt',
      flag: true,
    });
  });

  it('prefers gtag when available', async () => {
    const gtag = jest.fn();
    window.gtag = gtag;
    const { trackEvent } = await loadAnalytics();

    trackEvent('cta_click', { cta_name: 'submit' });

    expect(gtag).toHaveBeenCalledWith('event', 'cta_click', { cta_name: 'submit' });
    expect(window.dataLayer).toHaveLength(0);
  });

  it('trackSearch ignores empty queries and records length', async () => {
    const { trackSearch } = await loadAnalytics();
    trackSearch('   ');
    trackSearch('midjourney');

    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer[0]).toMatchObject({
      event: 'tool_search',
      query_length: 10,
      has_query: true,
    });
  });

  it('exposes stable conversion event names', async () => {
    const { AnalyticsEvents, trackComparisonView, trackCtaClick } = await loadAnalytics();

    trackComparisonView({ toolCount: 2, toolSlugs: 'a,b' });
    trackCtaClick({ cta: 'pro', location: 'header' });

    expect(AnalyticsEvents.COMPARISON_VIEW).toBe('comparison_view');
    expect(window.dataLayer[0].event).toBe('comparison_view');
    expect(window.dataLayer[1]).toMatchObject({
      event: 'cta_click',
      cta_name: 'pro',
      cta_location: 'header',
    });
  });
});
