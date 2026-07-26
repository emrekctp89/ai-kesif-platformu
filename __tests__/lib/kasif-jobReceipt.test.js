const {
  buildJobReceipt,
  buildJobReceiptSharePath,
  formatJobReceiptShareText,
  buildClientJobReceipt,
} = require('../../src/lib/kasif/jobReceipt');

describe('jobReceipt', () => {
  it('builds share path with locale prefix', () => {
    expect(buildJobReceiptSharePath('abc', 'tok', 'tr')).toBe('/kasif/receipt?id=abc&t=tok');
    expect(buildJobReceiptSharePath('abc', 'tok', 'en')).toBe('/en/kasif/receipt?id=abc&t=tok');
    expect(buildJobReceiptSharePath('', 'tok')).toBeNull();
  });

  it('marks milestone from funnel stages', () => {
    const receipt = buildJobReceipt(
      {
        id: 'i1',
        feedback_token: 't1',
        question: 'Sunum aracı öner',
        intent: { goals: ['presentation'] },
        funnel: {
          stages: {
            job_stated: '2026-07-26T10:00:00.000Z',
            first_result: '2026-07-26T10:10:00.000Z',
            job_done: '2026-07-26T10:20:00.000Z',
          },
          minutes_to_first_result: 10,
          selected_tool: { id: 1, slug: 'gamma', title: 'Gamma' },
          result_artifact: {
            bridge: 'paste',
            preview: 'Slide 1: Problem',
            packId: null,
          },
          events: [],
        },
      },
      { locale: 'tr', origin: 'https://aikesif.com' }
    );

    expect(receipt.hasMilestone).toBe(true);
    expect(receipt.milestone).toBe('job_done');
    expect(receipt.tool.title).toBe('Gamma');
    expect(receipt.minutesToFirstResult).toBe(10);
    expect(receipt.shareUrl).toContain('https://aikesif.com/kasif/receipt');
    expect(receipt.shareText).toMatch(/iş bitti|Gamma/i);
  });

  it('client receipt requires first_result or job_done', () => {
    const empty = buildClientJobReceipt({
      interactionId: 'x',
      feedbackToken: 'y',
      firstResult: false,
      jobDone: false,
    });
    expect(empty.hasMilestone).toBe(false);

    const ready = buildClientJobReceipt({
      interactionId: 'x',
      feedbackToken: 'y',
      source: { id: 2, title: 'Notion AI', slug: 'notion-ai' },
      firstResult: true,
      minutes: 15,
      packId: 'content-studio',
      locale: 'en',
    });
    expect(ready.hasMilestone).toBe(true);
    expect(ready.milestone).toBe('first_result');
    expect(ready.packId).toBe('content-studio');
    expect(formatJobReceiptShareText(ready, 'en')).toMatch(/First result|Notion/i);
  });
});
