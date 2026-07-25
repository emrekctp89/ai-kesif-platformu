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
});
