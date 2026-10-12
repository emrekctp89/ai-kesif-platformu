import {
  buildTrackedOutboundUrl,
  preserveReferrerRel,
  recordOutboundClick,
} from '@/utils/outboundLinks';

describe('outbound link attribution', () => {
  it('adds AI Kesif UTM parameters without losing the existing query or hash', () => {
    const result = new URL(
      buildTrackedOutboundUrl('https://example.com/product?ref=partner#pricing', {
        content: 'tool_detail',
      })
    );

    expect(result.searchParams.get('ref')).toBe('partner');
    expect(result.searchParams.get('utm_source')).toBe('aikesif');
    expect(result.searchParams.get('utm_medium')).toBe('referral');
    expect(result.searchParams.get('utm_campaign')).toBe('tool_directory');
    expect(result.searchParams.get('utm_content')).toBe('tool_detail');
    expect(result.hash).toBe('#pricing');
  });

  it('replaces stale attribution values with AI Kesif attribution', () => {
    const result = new URL(
      buildTrackedOutboundUrl('https://example.com/?utm_source=old&utm_medium=email')
    );

    expect(result.searchParams.get('utm_source')).toBe('aikesif');
    expect(result.searchParams.get('utm_medium')).toBe('referral');
    expect(result.searchParams.get('utm_campaign')).toBe('tool_directory');
  });

  it('leaves unsupported or malformed links unchanged', () => {
    expect(buildTrackedOutboundUrl('/tool/example')).toBe('/tool/example');
    expect(buildTrackedOutboundUrl('mailto:hello@example.com')).toBe('mailto:hello@example.com');
  });

  it('removes noreferrer while keeping security and SEO rel values', () => {
    expect(preserveReferrerRel('noreferrer nofollow')).toBe('nofollow noopener');
    expect(preserveReferrerRel('noopener noreferrer nofollow')).toBe('noopener nofollow');
  });

  it('records a tool click without blocking navigation', () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
    document.documentElement.lang = 'en';
    window.history.replaceState({}, '', '/en/tool/example?source=home');

    recordOutboundClick({
      toolId: 42,
      destinationUrl: 'https://example.com/product?utm_source=aikesif',
      placement: 'tool_card',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/outbound-click',
      expect.objectContaining({ method: 'POST', keepalive: true })
    );
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      toolId: 42,
      destinationUrl: 'https://example.com/product?utm_source=aikesif',
      placement: 'tool_card',
      referrerPath: '/en/tool/example?source=home',
      locale: 'en',
    });
  });
});
