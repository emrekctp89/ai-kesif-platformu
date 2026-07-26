const {
  buildLocalContentStudioRun,
  buildLocalSalesOutreachRun,
  buildLocalMeetingToActionRun,
  formatContentStudioArtifact,
  formatSalesOutreachArtifact,
  formatMeetingToActionArtifact,
  formatPackArtifact,
  isRunnablePack,
  RUNNABLE_PACK_IDS,
} = require('../../src/lib/kasif/packRunner');

describe('packRunner', () => {
  it('üç paketi runnable sayar', () => {
    expect(RUNNABLE_PACK_IDS).toEqual(
      expect.arrayContaining(['content-studio', 'sales-outreach', 'meeting-to-action'])
    );
    expect(isRunnablePack('content-studio')).toBe(true);
    expect(isRunnablePack('sales-outreach')).toBe(true);
    expect(isRunnablePack('meeting-to-action')).toBe(true);
    expect(isRunnablePack('pitch-deck')).toBe(false);
  });

  it('content-studio yerel runner taslak + seo üretir', () => {
    const run = buildLocalContentStudioRun('AI keşif platformu blog yazısı', 'tr');
    expect(run.packId).toBe('content-studio');
    expect(run.draft.length).toBeGreaterThan(100);
    expect(run.imagePrompt).toMatch(/AI keşif/i);
    expect(run.seo.title).toBeTruthy();
    const text = formatContentStudioArtifact(run, 'tr');
    expect(text).toMatch(/Görsel prompt/);
    expect(text).toMatch(/SEO/);
  });

  it('sales-outreach e-posta serisi üretir', () => {
    const run = buildLocalSalesOutreachRun('B2B demo teklifi', 'tr');
    expect(run.packId).toBe('sales-outreach');
    expect(run.subjects.length).toBeGreaterThanOrEqual(2);
    expect(run.sequence.length).toBe(3);
    expect(run.sequence[0].body).toMatch(/Konu:/);
    const text = formatSalesOutreachArtifact(run, 'tr');
    expect(text).toMatch(/CRM/);
    expect(formatPackArtifact(run, 'tr')).toBe(text);
  });

  it('meeting-to-action özet + aksiyon üretir', () => {
    const run = buildLocalMeetingToActionRun('Sprint planlama', 'en');
    expect(run.packId).toBe('meeting-to-action');
    expect(run.summary).toMatch(/Sprint/i);
    expect(run.actions.length).toBeGreaterThanOrEqual(2);
    expect(run.automationMap.steps.length).toBeGreaterThanOrEqual(2);
    const text = formatMeetingToActionArtifact(run, 'en');
    expect(text).toMatch(/Action items/i);
    expect(text).toMatch(/Automation map/i);
  });
});
