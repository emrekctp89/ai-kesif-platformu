const {
  buildOpsDigestSnapshot,
  formatOpsDigestSubject,
  formatOpsDigestText,
  formatOpsDigestHtml,
  formatOpsDigestWowMetric,
  formatOpsDigestWowLines,
  isOpsDigestNotifyEnabled,
  OPS_DIGEST_HISTORY_KEY,
  buildOpsDigestHistorySummary,
  buildOpsDigestHistoryRecord,
  appendOpsDigestHistory,
  parseOpsDigestHistoryRow,
  buildOpsDigestWeekDelta,
  pickOpsDigestDeltaPair,
} = require('../../src/lib/kasif/opsDigest');
const { buildKasifQualityStats } = require('../../src/lib/kasif/qualityStats');

describe('opsDigest', () => {
  const interactions = [
    {
      id: '1',
      question: 'sunum yap',
      intent: { goals: ['presentation-creation'], packId: 'seo-brief' },
      confidence: 0.9,
      feedback: 1,
      source_ids: ['tool:1'],
      funnel: {
        stages: {
          job_stated: '2026-07-20T10:00:00Z',
          tool_recommended: '2026-07-20T10:00:00Z',
          tool_selected: '2026-07-20T10:05:00Z',
          first_result: '2026-07-20T10:30:00Z',
          job_done: '2026-07-20T11:00:00Z',
        },
        minutes_to_first_result: 30,
        result_artifact: { bridge: 'runner', packId: 'seo-brief', runner_source: 'partner' },
        selected_tool: { title: 'Slayt AI', slug: 'slayt-ai' },
        events: [],
      },
      created_at: '2026-07-20T10:00:00Z',
    },
    {
      id: '2',
      question: 'ücretsiz sunum?',
      intent: { meta: 'soft-landing', softLandingVariant: 'A', goals: [] },
      confidence: 0.95,
      softLanding: true,
      feedback: null,
      source_ids: [],
      created_at: '2026-07-21T10:00:00Z',
    },
    {
      id: '3',
      question: 'Canva ile devam',
      intent: {
        fromSoftLanding: true,
        softLandingVariant: 'A',
        softLandingStarter: 'presentation',
        goals: ['presentation-creation'],
      },
      confidence: 0.88,
      feedback: null,
      source_ids: ['tool:2'],
      created_at: '2026-07-21T10:05:00Z',
    },
    {
      id: '4',
      question: 'Bu aracı ekle https://acme.ai',
      intent: {
        meta: 'add-tool',
        addTool: { status: 'queued', name: 'Acme', url: 'https://acme.ai', slug: 'acme' },
      },
      confidence: 0.9,
      feedback: null,
      source_ids: [],
      created_at: '2026-07-22T09:00:00Z',
    },
  ];

  it('buildOpsDigestSnapshot funnel, pack ROI ve soft-landing pin özetler', () => {
    const stats = buildKasifQualityStats(interactions, { windowDays: 7 });
    const snapshot = buildOpsDigestSnapshot(
      stats,
      {
        variant: 'B',
        pinnedAt: '2026-07-25T12:00:00Z',
        note: 'admin pick',
        source: 'app_settings',
        envForce: null,
        envDefault: 'ab',
      },
      {
        windowDays: 7,
        generatedAt: '2026-07-29T08:00:00Z',
        periodStart: '2026-07-22T08:00:00Z',
        periodEnd: '2026-07-29T08:00:00Z',
      }
    );

    expect(snapshot.kind).toBe('kasif_ops_digest');
    expect(snapshot.windowDays).toBe(7);
    expect(snapshot.periodLabel).toContain('2026-07-22');
    expect(snapshot.quality.total).toBe(4);
    expect(snapshot.quality.helpfulRate).toBe(100);
    expect(snapshot.funnel.counts.first_result).toBe(1);
    expect(snapshot.funnel.counts.job_done).toBe(1);
    expect(snapshot.funnel.runnerCount).toBe(1);
    expect(snapshot.funnel.runnerSourceMix.some((r) => r.source === 'partner')).toBe(true);
    expect(snapshot.packRoi.runs).toBeGreaterThanOrEqual(1);
    expect(snapshot.packRoi.topByRoi.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.softLanding.shown).toBeGreaterThanOrEqual(1);
    expect(snapshot.softLanding.followUps).toBeGreaterThanOrEqual(1);
    expect(snapshot.softLanding.pin.variant).toBe('B');
    expect(snapshot.softLanding.pin.effective).toBe('ops_pin:B');
    expect(snapshot.addTool.queued).toBe(1);
  });

  it('env force ops pin üzerinde önceliklidir', () => {
    const stats = buildKasifQualityStats(interactions, { windowDays: 7 });
    const snapshot = buildOpsDigestSnapshot(
      stats,
      { variant: 'B', envForce: 'A', envDefault: 'B' },
      { windowDays: 7, generatedAt: '2026-07-29T08:00:00Z' }
    );
    expect(snapshot.softLanding.pin.effective).toBe('env_force:A');
  });

  it('formatOpsDigestSubject ve text/html üretimi güvenli', () => {
    const stats = buildKasifQualityStats(interactions, { windowDays: 7 });
    const snapshot = buildOpsDigestSnapshot(
      stats,
      { variant: null, envForce: null, envDefault: null },
      {
        windowDays: 7,
        generatedAt: '2026-07-29T08:00:00Z',
        periodStart: '2026-07-22T00:00:00Z',
        periodEnd: '2026-07-29T00:00:00Z',
      }
    );

    const subject = formatOpsDigestSubject(snapshot);
    expect(subject).toMatch(/^\[Kâşif\] Ops özeti/);
    expect(subject).toMatch(/FR 1/);

    const text = formatOpsDigestText(snapshot, {
      siteUrl: 'https://example.com',
      adminPath: '/admin?tab=kasif_quality',
    });
    expect(text).toContain('Kâşif haftalık ops özeti');
    expect(text).toContain('Pack ROI');
    expect(text).toContain('Soft-landing');
    expect(text).toContain('https://example.com/admin?tab=kasif_quality');
    expect(text).toContain('Add-tool');

    const html = formatOpsDigestHtml(snapshot, { siteUrl: 'https://example.com' });
    expect(html).toContain('Admin · Kâşif kalite');
    expect(html).toContain('https://example.com/admin?tab=kasif_quality');
    expect(html).not.toContain('<script');
  });

  it('formatOpsDigest text/subject includes WoW when weekDelta given', () => {
    const stats = buildKasifQualityStats(interactions, { windowDays: 7 });
    const snapshot = buildOpsDigestSnapshot(
      stats,
      { variant: null, envForce: null, envDefault: null },
      {
        windowDays: 7,
        generatedAt: '2026-07-29T08:00:00Z',
        periodStart: '2026-07-22T00:00:00Z',
        periodEnd: '2026-07-29T00:00:00Z',
      }
    );
    const weekDelta = {
      available: true,
      currentPeriod: '2026-07-22 → 2026-07-29',
      previousPeriod: '2026-07-15 → 2026-07-22',
      firstResult: { current: 1, previous: 0, delta: 1, pct: null },
      jobDone: { current: 1, previous: 0, delta: 1, pct: null },
      runnerRuns: { current: 1, previous: 2, delta: -1, pct: -50 },
      qualityTotal: { current: 4, previous: 3, delta: 1, pct: 33.3 },
      helpfulRate: { current: 100, previous: 90, delta: 10 },
    };

    expect(formatOpsDigestWowMetric(weekDelta.firstResult)).toBe('+1');
    expect(formatOpsDigestWowMetric(weekDelta.runnerRuns)).toBe('-1 (-50%)');
    expect(formatOpsDigestWowLines(weekDelta).join('\n')).toMatch(/Haftadan haftaya/);
    expect(formatOpsDigestWowLines(null)).toEqual([]);

    const subject = formatOpsDigestSubject(snapshot, { weekDelta });
    expect(subject).toMatch(/WoW FR \+1/);
    expect(subject).toMatch(/done \+1/);

    const text = formatOpsDigestText(snapshot, { weekDelta });
    expect(text).toContain('Haftadan haftaya (WoW)');
    expect(text).toContain('FR: +1');
    expect(text).toContain('runner: -1 (-50%)');
    expect(text).toContain('Helpful: +10 pp');
  });

  it('boş stats ile güvenli varsayılanlar', () => {
    const snapshot = buildOpsDigestSnapshot(
      {},
      {},
      { windowDays: 7, generatedAt: '2026-07-29T00:00:00Z' }
    );
    expect(snapshot.quality.total).toBe(0);
    expect(snapshot.funnel.counts.job_stated).toBe(0);
    expect(snapshot.packRoi.topByRoi).toEqual([]);
    expect(snapshot.softLanding.pin.effective).toBe('ab_split');
    const text = formatOpsDigestText(snapshot);
    expect(text).toContain('henüz pack runner ROI verisi yok');
  });

  it('isOpsDigestNotifyEnabled yalnızca true iken açılır', () => {
    expect(isOpsDigestNotifyEnabled({ KASIF_OPS_DIGEST: 'true' })).toBe(true);
    expect(isOpsDigestNotifyEnabled({ KASIF_OPS_DIGEST: 'TRUE' })).toBe(true);
    expect(isOpsDigestNotifyEnabled({ KASIF_OPS_DIGEST: '1' })).toBe(false);
    expect(isOpsDigestNotifyEnabled({})).toBe(false);
  });

  it('history append ring + parse app_settings value', () => {
    const stats = buildKasifQualityStats(interactions, { windowDays: 7 });
    const snapshot = buildOpsDigestSnapshot(
      stats,
      { variant: 'A', envForce: null, envDefault: null },
      {
        windowDays: 7,
        generatedAt: '2026-07-29T08:00:00Z',
        periodStart: '2026-07-22T00:00:00Z',
        periodEnd: '2026-07-29T00:00:00Z',
      }
    );

    const record = buildOpsDigestHistoryRecord(snapshot, {
      savedAt: '2026-07-29T08:01:00Z',
      subject: formatOpsDigestSubject(snapshot),
      emailSent: true,
    });
    expect(record.snapshot?.kind).toBe('kasif_ops_digest');
    expect(record.funnel.first_result).toBe(1);
    expect(record.emailSent).toBe(true);

    const summary = buildOpsDigestHistorySummary(snapshot, { savedAt: '2026-07-29T08:01:00Z' });
    expect(summary.snapshot).toBeUndefined();
    expect(summary.packRoi).toBeDefined();

    let doc = appendOpsDigestHistory(null, record, { max: 3 });
    expect(doc.key).toBe(OPS_DIGEST_HISTORY_KEY);
    expect(doc.last.subject).toMatch(/Ops özeti/);
    expect(doc.history).toHaveLength(1);
    expect(doc.history[0].snapshot).toBeUndefined();

    const second = buildOpsDigestHistoryRecord(snapshot, {
      savedAt: '2026-08-05T08:00:00Z',
      emailSent: false,
      emailReason: 'disabled',
    });
    doc = appendOpsDigestHistory(doc, second, { max: 3 });
    expect(doc.history).toHaveLength(2);
    expect(doc.last.savedAt).toBe('2026-08-05T08:00:00Z');
    expect(doc.history[0].savedAt).toBe('2026-08-05T08:00:00Z');

    const parsed = parseOpsDigestHistoryRow({
      key: OPS_DIGEST_HISTORY_KEY,
      value: { version: 1, last: doc.last, history: doc.history, updatedAt: doc.updatedAt },
      updated_at: '2026-08-05T08:00:00Z',
    });
    expect(parsed.last.funnel.first_result).toBe(1);
    expect(parsed.history.length).toBe(2);
    expect(parseOpsDigestHistoryRow(null).last).toBeNull();
  });

  it('buildOpsDigestWeekDelta FR/done/runs farkını hesaplar', () => {
    const current = {
      periodLabel: '2026-07-22 → 2026-07-29',
      funnel: { first_result: 12, job_done: 8 },
      packRoi: { runs: 20 },
      quality: { total: 100, helpfulRate: 72 },
    };
    const previous = {
      periodLabel: '2026-07-15 → 2026-07-22',
      funnel: { first_result: 10, job_done: 5 },
      packRoi: { runs: 25 },
      quality: { total: 90, helpfulRate: 70 },
    };

    const delta = buildOpsDigestWeekDelta(current, previous);
    expect(delta.available).toBe(true);
    expect(delta.firstResult).toEqual({ current: 12, previous: 10, delta: 2, pct: 20 });
    expect(delta.jobDone.delta).toBe(3);
    expect(delta.jobDone.pct).toBe(60);
    expect(delta.runnerRuns.delta).toBe(-5);
    expect(delta.runnerRuns.pct).toBe(-20);
    expect(delta.helpfulRate.delta).toBe(2);
    expect(buildOpsDigestWeekDelta(current, null)).toBeNull();

    const pair = pickOpsDigestDeltaPair({
      history: [current, previous],
    });
    expect(pair.delta.firstResult.delta).toBe(2);
    expect(pickOpsDigestDeltaPair({ history: [current] }).delta).toBeNull();
  });
});
