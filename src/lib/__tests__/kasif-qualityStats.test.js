const {
  buildKasifQualityStats,
  isKasifIssueInteraction,
  isKasifMetaInteraction,
  isKasifSoftLandingInteraction,
  isKasifUngroundedInteraction,
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
  ];

  it('özet metrikleri ve kural adaylarını hesaplar', () => {
    const stats = buildKasifQualityStats(sample, { windowDays: 30, sampleLimit: 5 });

    expect(stats.total).toBe(5);
    expect(stats.withFeedback).toBe(2);
    expect(stats.positive).toBe(1);
    expect(stats.negative).toBe(1);
    expect(stats.helpfulRate).toBe(50);
    expect(stats.ungrounded).toBe(1);
    expect(stats.meta).toBe(1);
    expect(stats.softLanding).toBe(1);
    expect(stats.lowConfidence).toBe(1);
    expect(stats.topGoals[0].goals).toMatch(/presentation-creation|logo-design|hedef yok/);
    expect(stats.recentNegative[0].id).toBe('2');
    expect(stats.ruleCandidates.length).toBeGreaterThan(0);
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
