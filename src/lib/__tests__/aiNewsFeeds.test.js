/** @jest-environment node */

jest.mock('server-only', () => ({}));

import { parseAiNewsFeed, parseXSearchResponse } from '../aiNewsFeeds';

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

describe('parseXSearchResponse', () => {
  it('maps posts from official accounts to attributed news items', () => {
    const items = parseXSearchResponse({
      data: [
        {
          id: '123',
          author_id: '42',
          text: 'We are launching a new AI model today.',
          created_at: '2026-10-14T08:00:00.000Z',
        },
      ],
      includes: { users: [{ id: '42', name: 'OpenAI', username: 'OpenAI' }] },
    });

    expect(items).toEqual([
      expect.objectContaining({
        source_id: 'x-openai',
        source_name: 'X · OpenAI',
        article_url: 'https://x.com/OpenAI/status/123',
      }),
    ]);
  });

  it('drops posts without a resolvable author', () => {
    expect(
      parseXSearchResponse({
        data: [{ id: '123', author_id: 'missing', text: 'Post', created_at: '2026-10-14' }],
      })
    ).toEqual([]);
  });
});
