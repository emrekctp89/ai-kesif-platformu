const {
  RECEIPT_SOCIAL_PROOF_MIN_VISIBLE,
  buildReceiptSocialProofStats,
  toPublicReceiptSocialProof,
} = require('../../src/lib/kasif/receiptSocialProof');

describe('receiptSocialProof', () => {
  const rows = [
    {
      intent: { packId: 'seo-brief' },
      funnel: {
        stages: {
          job_stated: '2026-07-20T10:00:00Z',
          first_result: '2026-07-20T10:20:00Z',
          job_done: '2026-07-20T11:00:00Z',
        },
        minutes_to_first_result: 20,
        result_artifact: { bridge: 'runner', packId: 'seo-brief' },
      },
      created_at: '2026-07-20T10:00:00Z',
    },
    {
      intent: {},
      funnel: {
        stages: { first_result: '2026-07-21T10:00:00Z' },
        minutes_to_first_result: 10,
        result_artifact: { bridge: 'paste' },
      },
      created_at: '2026-07-21T10:00:00Z',
    },
    {
      intent: { packId: 'seo-brief' },
      funnel: {
        stages: { first_result: '2026-07-22T10:00:00Z', job_done: '2026-07-22T12:00:00Z' },
        minutes_to_first_result: 15,
        result_artifact: { bridge: 'runner', packId: 'seo-brief' },
      },
      created_at: '2026-07-22T10:00:00Z',
    },
    {
      // no milestone — ignored
      intent: {},
      funnel: { stages: { job_stated: '2026-07-22T10:00:00Z' }, events: [] },
      created_at: '2026-07-22T11:00:00Z',
    },
  ];

  it('aggregates first_result / job_done without PII fields', () => {
    const stats = buildReceiptSocialProofStats(rows, {
      windowDays: 30,
      generatedAt: '2026-07-29T12:00:00Z',
    });

    expect(stats.kind).toBe('kasif_receipt_social_proof');
    expect(stats.windowDays).toBe(30);
    expect(stats.withMilestone).toBe(3);
    expect(stats.firstResults).toBe(3);
    expect(stats.jobDones).toBe(2);
    expect(stats.runnerCount).toBe(2);
    expect(stats.bridgePasteCount).toBe(1);
    expect(stats.avgMinutesToFirstResult).toBe(15); // round((20+10+15)/3)
    expect(stats.doneOfFirstResult).toBeCloseTo(66.7, 0);
    expect(stats.topPacks[0]).toEqual({ packId: 'seo-brief', count: 2 });
    expect(stats.visible).toBe(true);
    expect(stats.minVisible).toBe(RECEIPT_SOCIAL_PROOF_MIN_VISIBLE);

    const pub = toPublicReceiptSocialProof(stats);
    expect(pub).not.toHaveProperty('kind');
    expect(JSON.stringify(pub)).not.toMatch(/question|token|feedback/i);
    expect(pub.visible).toBe(true);
    // Pack leaders for social-proof strip chips
    expect(pub.topPacks).toEqual([{ packId: 'seo-brief', count: 2 }]);
  });

  it('hides strip when below minVisible threshold', () => {
    const sparse = buildReceiptSocialProofStats(rows.slice(0, 1), {
      windowDays: 7,
      minVisible: 3,
    });
    expect(sparse.withMilestone).toBe(1);
    expect(sparse.visible).toBe(false);

    const open = buildReceiptSocialProofStats(rows.slice(0, 1), {
      windowDays: 7,
      minVisible: 1,
    });
    expect(open.visible).toBe(true);
  });

  it('returns safe empty defaults', () => {
    const empty = buildReceiptSocialProofStats([]);
    expect(empty.withMilestone).toBe(0);
    expect(empty.firstResults).toBe(0);
    expect(empty.jobDones).toBe(0);
    expect(empty.topPacks).toEqual([]);
    expect(empty.visible).toBe(false);
    expect(empty.avgMinutesToFirstResult).toBeNull();
  });
});
