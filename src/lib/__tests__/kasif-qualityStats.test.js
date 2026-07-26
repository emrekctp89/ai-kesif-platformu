const {
  buildAddToolStats,
  buildKasifQualityStats,
  isKasifAddToolInteraction,
  isKasifIssueInteraction,
  isKasifMetaInteraction,
  isKasifSoftLandingInteraction,
  isKasifUngroundedInteraction,
  pickSoftLandingWinner,
} = require('../kasif/qualityStats');

describe('buildKasifQualityStats', () => {
  const sample = [
    {
      id: '1',
      question: 'ücretsiz sunum aracı öner',
      intent: { goals: ['presentation-creation'] },
      confidence: 0.9,
      feedback: 1,
      source_ids: ['tool:1'],
      created_at: '2026-07-20T10:00:00Z',
    },
    {
      id: '2',
      question: 'logo tasarlamak istiyorum',
      intent: { goals: ['logo-design'] },
      confidence: 0.4,
      feedback: -1,
      source_ids: ['tool:2'],
      created_at: '2026-07-21T10:00:00Z',
    },
    {
      id: '3',
      question: 'uzay gemisi motoru',
      intent: { goals: [] },
      confidence: 0,
      feedback: null,
      source_ids: [],
      created_at: '2026-07-22T10:00:00Z',
    },
    {
      id: '4',
      question: 'Sen kimsin?',
      intent: { meta: 'identity', goals: [] },
      confidence: 0.99,
      feedback: null,
      source_ids: [],
      created_at: '2026-07-22T11:00:00Z',
    },
    {
      id: '5',
      question: 'Peki bunlardan ücretsiz olanlar hangileri?',
      intent: { meta: 'soft-landing', goals: [], pricePreference: 'free' },
      confidence: 0.92,
      softLanding: true,
      feedback: null,
      source_ids: [],
      created_at: '2026-07-22T12:00:00Z',
    },
    {
      id: '6',
      question: 'Bu aracı ekle https://acme.ai',
      intent: {
        meta: 'add-tool',
        addTool: { status: 'queued', name: 'Acme', url: 'https://acme.ai', slug: 'acme' },
      },
      confidence: 0.93,
      feedback: null,
      source_ids: [],
      created_at: '2026-07-23T10:00:00Z',
    },
    {
      id: '7',
      question: 'Kataloga araç ekle',
      intent: { meta: 'add-tool', addTool: { status: 'missing_url' } },
      confidence: 0.95,
      feedback: null,
      source_ids: [],
      created_at: '2026-07-23T11:00:00Z',
    },
    {
      id: '8',
      question: 'Add this tool https://acme.ai',
      intent: { meta: 'add-tool', addTool: { status: 'duplicate', name: 'Acme' } },
      confidence: 0.9,
      feedback: null,
      source_ids: [],
      created_at: '2026-07-23T12:00:00Z',
    },
  ];

  it('özet metrikleri ve kural adaylarını hesaplar', () => {
    const stats = buildKasifQualityStats(sample, { windowDays: 30, sampleLimit: 5 });

    expect(stats.total).toBe(8);
    expect(stats.withFeedback).toBe(2);
    expect(stats.positive).toBe(1);
    expect(stats.negative).toBe(1);
    expect(stats.helpfulRate).toBe(50);
    expect(stats.ungrounded).toBe(1);
    expect(stats.meta).toBe(1);
    expect(stats.softLanding).toBe(1);
    expect(stats.recentSoftLanding?.[0]?.id).toBe('5');
    expect(stats.softLandingPriceBuckets?.free).toBe(1);
    expect(stats.topSoftLandingTokens?.length).toBeGreaterThan(0);
    expect(stats.lowConfidence).toBe(1);
    expect(stats.topGoals[0].goals).toMatch(/presentation-creation|logo-design|hedef yok/);
    expect(stats.recentNegative[0].id).toBe('2');
    expect(stats.ruleCandidates.length).toBeGreaterThan(0);
    expect(stats.jobFunnel).toBeDefined();
    expect(stats.jobFunnel.withFunnel).toBe(0);
    expect(stats.addTool.total).toBe(3);
    expect(stats.addTool.statusCounts.queued).toBe(1);
    expect(stats.addTool.statusCounts.duplicate).toBe(1);
    expect(stats.addTool.statusCounts.missing_url).toBe(1);
    expect(isKasifAddToolInteraction(sample[5])).toBe(true);
    expect(isKasifMetaInteraction(sample[5])).toBe(false);
  });

  it('buildAddToolStats dedupe oranlarını hesaplar', () => {
    const add = buildAddToolStats(sample, 10);
    expect(add.total).toBe(3);
    expect(add.duplicateRate).toBeCloseTo(33.3, 0);
    expect(add.recent[0].status).toBeTruthy();
  });

  it('soft-landing conversion metriklerini hesaplar', () => {
    const withConversion = [
      ...sample,
      {
        id: 'sl-a',
        question: 'Peki bunlardan hangileri?',
        intent: { meta: 'soft-landing', softLandingVariant: 'A', pricePreference: 'free' },
        softLanding: true,
        confidence: 0.92,
        source_ids: [],
        created_at: '2026-07-22T12:01:00Z',
      },
      {
        id: 'sl-b',
        question: 'Which of those?',
        intent: { meta: 'soft-landing', softLandingVariant: 'B' },
        softLanding: true,
        confidence: 0.92,
        source_ids: [],
        created_at: '2026-07-22T12:02:00Z',
      },
      {
        id: '6',
        question: 'ücretsiz sunum hazırla',
        intent: {
          goals: ['presentation-creation'],
          fromSoftLanding: true,
          softLandingStarter: 'presentation',
          softLandingParentId: '5',
          softLandingVariant: 'A',
        },
        confidence: 0.88,
        feedback: null,
        source_ids: ['tool:9'],
        created_at: '2026-07-22T12:05:00Z',
      },
      {
        id: '7',
        question: 'yine belirsiz',
        intent: {
          fromSoftLanding: true,
          softLandingStarter: '(free-text)',
          softLandingVariant: 'B',
        },
        confidence: 0.2,
        feedback: null,
        source_ids: [],
        created_at: '2026-07-22T12:10:00Z',
      },
      {
        id: '8',
        question: 'seo brief istiyorum',
        intent: {
          fromSoftLanding: true,
          softLandingStarter: 'seo',
          softLandingVariant: 'B',
        },
        confidence: 0.85,
        source_ids: ['tool:10'],
        created_at: '2026-07-22T12:12:00Z',
      },
    ];
    const stats = buildKasifQualityStats(withConversion);
    // sample has 1 soft-landing + 2 more shown = 3
    expect(stats.softLandingConversion.shown).toBeGreaterThanOrEqual(3);
    expect(stats.softLandingConversion.followUps).toBe(3);
    expect(stats.softLandingConversion.converted).toBe(2);
    expect(stats.softLandingConversion.starters[0].starter).toMatch(/presentation|free-text|seo/);
    const variants = stats.softLandingConversion.variants;
    expect(variants.some((v) => v.variant === 'A')).toBe(true);
    expect(variants.some((v) => v.variant === 'B')).toBe(true);
    const b = variants.find((v) => v.variant === 'B');
    expect(b.followUps).toBe(2);
    expect(b.converted).toBe(1);
    expect(b.convertOfFollowUp).toBe(50);
    expect(stats.softLandingConversion.winner).toBeDefined();
    expect(stats.softLandingConversion.winner.reason).toBe('insufficient_sample');
  });

  it('pickSoftLandingWinner yeterli örnekte kazanan seçer', () => {
    const pending = pickSoftLandingWinner(
      [
        { variant: 'A', shown: 10, followUps: 5, converted: 2, convertOfFollowUp: 40 },
        { variant: 'B', shown: 10, followUps: 5, converted: 3, convertOfFollowUp: 60 },
      ],
      { minFollowUps: 20 }
    );
    expect(pending.winner).toBeNull();
    expect(pending.reason).toBe('insufficient_sample');

    const lead = pickSoftLandingWinner(
      [
        { variant: 'A', shown: 40, followUps: 30, converted: 9, convertOfFollowUp: 30 },
        { variant: 'B', shown: 40, followUps: 30, converted: 15, convertOfFollowUp: 50 },
      ],
      { minFollowUps: 20 }
    );
    expect(lead.winner).toBe('B');
    expect(lead.deltaConvertOfFollowUp).toBe(20);

    const tie = pickSoftLandingWinner(
      [
        { variant: 'A', shown: 40, followUps: 30, converted: 12, convertOfFollowUp: 40 },
        { variant: 'B', shown: 40, followUps: 30, converted: 12, convertOfFollowUp: 40 },
      ],
      { minFollowUps: 20 }
    );
    expect(tie.winner).toBe('tie');
  });

  it('funnel kayıtlarını jobFunnel özetine yansıtır', () => {
    const withFunnel = [
      ...sample,
      {
        id: '6',
        question: 'sunum yap',
        intent: { goals: ['presentation-creation'] },
        confidence: 0.8,
        feedback: null,
        source_ids: ['tool:1'],
        funnel: {
          stages: {
            job_stated: '2026-07-25T10:00:00Z',
            tool_recommended: '2026-07-25T10:00:00Z',
            first_result: '2026-07-25T10:20:00Z',
          },
          minutes_to_first_result: 20,
          selected_tool: { title: 'Slayt AI', slug: 'slayt-ai' },
          events: [],
        },
        created_at: '2026-07-25T10:00:00Z',
      },
    ];
    const stats = buildKasifQualityStats(withFunnel);
    expect(stats.jobFunnel.withFunnel).toBe(1);
    expect(stats.jobFunnel.counts.first_result).toBe(1);
    expect(stats.jobFunnel.avgMinutesToFirstResult).toBe(20);
    expect(stats.jobFunnel.topSelectedTools[0].label).toBe('Slayt AI');
  });

  it('meta ve soft-landing yanıtları ungrounded/issue saymaz', () => {
    const metaRow = sample[3];
    const softRow = sample[4];
    expect(isKasifMetaInteraction(metaRow)).toBe(true);
    expect(isKasifSoftLandingInteraction(softRow)).toBe(true);
    expect(isKasifMetaInteraction(softRow)).toBe(false);
    expect(isKasifUngroundedInteraction(metaRow)).toBe(false);
    expect(isKasifUngroundedInteraction(softRow)).toBe(false);
    expect(isKasifIssueInteraction(metaRow)).toBe(false);
    expect(isKasifIssueInteraction(softRow)).toBe(false);
    expect(isKasifUngroundedInteraction(sample[2])).toBe(true);
  });

  it('boş listede güvenli varsayılanlar döner', () => {
    const stats = buildKasifQualityStats([]);
    expect(stats.total).toBe(0);
    expect(stats.helpfulRate).toBeNull();
    expect(stats.avgConfidence).toBeNull();
    expect(stats.recentNegative).toEqual([]);
  });
});
