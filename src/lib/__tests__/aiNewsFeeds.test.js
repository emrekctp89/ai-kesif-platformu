/** @jest-environment node */

jest.mock('server-only', () => ({}));

import { parseAiNewsFeed } from '../aiNewsFeeds';

describe('parseAiNewsFeed', () => {
  const source = { id: 'test', name: 'Test AI', siteUrl: 'https://example.com' };

  it('parses RSS items and removes HTML from excerpts', () => {
    const items = parseAiNewsFeed(
      `<?xml version="1.0"?><rss><channel><item><title>New &amp; useful</title><link>https://example.com/post</link><description><![CDATA[<p>Hello <strong>AI</strong></p>]]></description><pubDate>Tue, 13 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>`,
      source
    );

    expect(items).toEqual([
      expect.objectContaining({
        source_id: 'test',
        title: 'New & useful',
        summary: 'Hello AI',
        article_url: 'https://example.com/post',
      }),
    ]);
  });

  it('rejects unsafe article URLs', () => {
    const items = parseAiNewsFeed(
      `<feed><entry><title>Unsafe</title><link href="javascript:alert(1)" /></entry></feed>`,
      source
    );
    expect(items).toEqual([]);
  });
});
