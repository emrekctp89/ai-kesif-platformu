import { buildTrackedOutboundUrl, preserveReferrerRel } from '@/utils/outboundLinks';

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
});
