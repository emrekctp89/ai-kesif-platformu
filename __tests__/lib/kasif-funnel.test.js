const {
  applyFunnelStage,
  buildJobFunnelStats,
  highestFunnelStage,
  isValidFunnelStage,
  seedFunnelFromResponse,
  KASIF_FUNNEL_STAGES,
} = require('../../src/lib/kasif/funnel');

describe('kasif funnel', () => {
  it('geçerli stage listesini tanır', () => {
    expect(isValidFunnelStage('first_result')).toBe(true);
    expect(isValidFunnelStage('click')).toBe(false);
    expect(KASIF_FUNNEL_STAGES[0]).toBe('job_stated');
  });

  it('stage uygularken önkoşulları doldurur', () => {
    const funnel = applyFunnelStage({}, 'setup_started', {
      selectedTool: { id: 'tool:1', title: 'Slayt AI' },
    });
    expect(funnel.stages.job_stated).toBeTruthy();
    expect(funnel.stages.tool_recommended).toBeTruthy();
    expect(funnel.stages.tool_selected).toBeTruthy();
    expect(funnel.stages.setup_started).toBeTruthy();
    expect(funnel.selected_tool.title).toBe('Slayt AI');
    expect(highestFunnelStage(funnel)).toBe('setup_started');
  });

  it('mevcut stage zaman damgasını ezmez', () => {
    const first = applyFunnelStage({}, 'job_stated', { at: '2026-07-01T10:00:00.000Z' });
    const second = applyFunnelStage(first, 'tool_recommended', {
      at: '2026-07-01T11:00:00.000Z',
    });
    expect(second.stages.job_stated).toBe('2026-07-01T10:00:00.000Z');
    expect(second.stages.tool_recommended).toBe('2026-07-01T11:00:00.000Z');
  });

  it('meta ve soft-landing yanıtlarda seed üretmez', () => {
    expect(
      seedFunnelFromResponse({ intent: { meta: 'identity' }, meta: true }, { sources: [] })
    ).toBeNull();
    expect(
      seedFunnelFromResponse(
        { softLanding: true, intent: { meta: 'soft-landing' } },
        { sources: [] }
      )
    ).toBeNull();
  });

  it('kaynaklı öneride job_stated + tool_recommended seedler', () => {
    const funnel = seedFunnelFromResponse(
      { intent: { goals: ['presentation-creation'] }, confidence: 0.9 },
      { sources: [{ id: '1', title: 'A' }] }
    );
    expect(funnel.stages.job_stated).toBeTruthy();
    expect(funnel.stages.tool_recommended).toBeTruthy();
    expect(funnel.stages.tool_selected).toBeFalsy();
  });

  it('result_artifact bilgisini korur', () => {
    const withArtifact = {
      stages: { first_result: '2026-07-25T10:00:00.000Z' },
      result_artifact: {
        bridge: 'paste',
        goal: 'email-writing',
        char_count: 120,
        fingerprint: 'fnv1a_abc',
        preview: 'Merhaba',
      },
      events: [],
    };
    const next = applyFunnelStage(withArtifact, 'job_done');
    expect(next.result_artifact.bridge).toBe('paste');
    expect(next.result_artifact.goal).toBe('email-writing');
    expect(next.stages.job_done).toBeTruthy();
  });

  it('admin hunisi dönüşüm oranlarını hesaplar', () => {
    const stats = buildJobFunnelStats([
      {
        funnel: applyFunnelStage({}, 'tool_recommended'),
      },
      {
        funnel: applyFunnelStage(
          applyFunnelStage({}, 'first_result', { minutesToFirstResult: 10 }),
          'job_done'
        ),
      },
      { funnel: {} },
    ]);
    expect(stats.withFunnel).toBe(2);
    expect(stats.counts.job_stated).toBe(2);
    expect(stats.counts.first_result).toBe(1);
    expect(stats.counts.job_done).toBe(1);
    expect(stats.avgMinutesToFirstResult).toBe(10);
    expect(stats.conversion.firstResultOfStated).toBe(50);
    expect(stats.conversion.doneOfStated).toBe(50);
  });

  it('pack_id conversion kovalarını hesaplar', () => {
    const stats = buildJobFunnelStats([
      {
        intent: { packId: 'content-studio' },
        funnel: {
          stages: {
            job_stated: '2026-07-25T10:00:00.000Z',
            first_result: '2026-07-25T10:05:00.000Z',
          },
          result_artifact: {
            bridge: 'runner',
            packId: 'content-studio',
            runner_source: 'partner',
          },
          events: [],
        },
      },
      {
        intent: { packId: 'content-studio' },
        funnel: {
          stages: { job_stated: '2026-07-25T11:00:00.000Z' },
          events: [],
        },
      },
      {
        intent: { packId: 'seo-brief' },
        funnel: {
          stages: {
            job_stated: '2026-07-25T12:00:00.000Z',
            first_result: '2026-07-25T12:02:00.000Z',
          },
          result_artifact: {
            bridge: 'runner',
            packId: 'seo-brief',
            runner_source: 'local',
          },
          events: [
            {
              stage: 'first_result',
              at: '2026-07-25T12:02:00.000Z',
              meta: { runner_source: 'local', packId: 'seo-brief' },
            },
          ],
        },
      },
    ]);
    expect(stats.packStats[0].packId).toBe('content-studio');
    expect(stats.packStats[0].total).toBe(2);
    expect(stats.packStats[0].firstResult).toBe(1);
    expect(stats.packStats[0].firstResultRate).toBe(50);
    expect(stats.runnerCount).toBe(2);
    expect(stats.runnerSourceCounts.partner).toBe(1);
    expect(stats.runnerSourceCounts.local).toBe(1);
    expect(stats.runnerSourceMix.map((s) => s.source)).toEqual(
      expect.arrayContaining(['partner', 'local'])
    );
    expect(stats.packStats.find((p) => p.packId === 'content-studio')?.sources?.partner).toBe(1);
    expect(stats.packRoi).toBeDefined();
    expect(stats.packRoi.runs).toBe(2);
    expect(stats.packRoi.firstResults).toBeGreaterThanOrEqual(2);
    expect(stats.packStats[0].frPerRun != null || stats.packStats[0].runner === 0).toBe(true);
  });

  it('pack ROI skorunu runner başına job_done ile hesaplar', () => {
    const stats = buildJobFunnelStats([
      {
        intent: { packId: 'seo-brief' },
        funnel: {
          stages: {
            job_stated: '2026-07-26T10:00:00.000Z',
            first_result: '2026-07-26T10:02:00.000Z',
            job_done: '2026-07-26T10:05:00.000Z',
          },
          result_artifact: {
            bridge: 'runner',
            packId: 'seo-brief',
            runner_source: 'gemini',
          },
          events: [],
        },
      },
      {
        intent: { packId: 'seo-brief' },
        funnel: {
          stages: {
            job_stated: '2026-07-26T11:00:00.000Z',
            first_result: '2026-07-26T11:02:00.000Z',
          },
          result_artifact: {
            bridge: 'runner',
            packId: 'seo-brief',
            runner_source: 'local',
          },
          events: [],
        },
      },
      {
        intent: { packId: 'content-studio' },
        funnel: {
          stages: {
            job_stated: '2026-07-26T12:00:00.000Z',
            first_result: '2026-07-26T12:01:00.000Z',
          },
          result_artifact: {
            bridge: 'runner',
            packId: 'content-studio',
            runner_source: 'partner',
          },
          events: [],
        },
      },
    ]);
    const seo = stats.packStats.find((p) => p.packId === 'seo-brief');
    expect(seo.runner).toBe(2);
    expect(seo.jobDone).toBe(1);
    expect(seo.donePerRun).toBe(0.5);
    expect(seo.roiScore).toBe(0.5);
    expect(stats.packRoi.topByRoi[0].packId).toBe('seo-brief');
    expect(stats.packRoi.donePerRun).toBeCloseTo(1 / 3, 2);
  });

  it('pro onboarding → first_result metriklerini hesaplar', () => {
    const stats = buildJobFunnelStats([
      {
        intent: {
          packId: 'content-studio',
          source: 'pack-runner',
          proOnboardingStatus: 'complete',
          proOnboardingCompleted: true,
        },
        funnel: {
          stages: {
            job_stated: '2026-07-26T10:00:00.000Z',
            first_result: '2026-07-26T10:01:00.000Z',
          },
          result_artifact: {
            bridge: 'runner',
            packId: 'content-studio',
            runner_source: 'local',
          },
          events: [],
        },
      },
      {
        intent: {
          packId: 'content-studio',
          source: 'pack-runner',
          proOnboardingStatus: 'dismiss',
        },
        funnel: {
          stages: {
            job_stated: '2026-07-26T11:00:00.000Z',
            first_result: '2026-07-26T11:01:00.000Z',
          },
          result_artifact: { bridge: 'runner', packId: 'content-studio' },
          events: [],
        },
      },
      {
        intent: { packId: 'seo-brief', source: 'pack-runner' },
        funnel: {
          stages: {
            job_stated: '2026-07-26T12:00:00.000Z',
            first_result: '2026-07-26T12:01:00.000Z',
          },
          result_artifact: { bridge: 'runner', packId: 'seo-brief' },
          events: [],
        },
      },
    ]);

    expect(stats.proOnboarding.runnerTotal).toBe(3);
    expect(stats.proOnboarding.complete).toBe(1);
    expect(stats.proOnboarding.dismiss).toBe(1);
    expect(stats.proOnboarding.none).toBe(1);
    expect(stats.proOnboarding.completeFirstResult).toBe(1);
    expect(stats.proOnboarding.firstResultOfComplete).toBe(100);
    expect(stats.proOnboarding.completeShareOfFirstResult).toBeCloseTo(33.3, 0);
  });
});
