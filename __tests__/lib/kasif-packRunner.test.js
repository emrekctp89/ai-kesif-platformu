const {
  buildLocalContentStudioRun,
  buildLocalSalesOutreachRun,
  buildLocalMeetingToActionRun,
  buildLocalSocialLaunchRun,
  buildLocalPitchDeckRun,
  buildLocalSeoBriefRun,
  buildLocalSupportKitRun,
  formatContentStudioArtifact,
  formatSalesOutreachArtifact,
  formatMeetingToActionArtifact,
  formatSocialLaunchArtifact,
  formatPitchDeckArtifact,
  formatSeoBriefArtifact,
  formatSupportKitArtifact,
  formatPackArtifact,
  extractRunSteps,
  isRunnablePack,
  RUNNABLE_PACK_IDS,
} = require('../../src/lib/kasif/packRunner');

describe('packRunner', () => {
  it('yedi paketi runnable sayar', () => {
    expect(RUNNABLE_PACK_IDS).toEqual(
      expect.arrayContaining([
        'content-studio',
        'sales-outreach',
        'meeting-to-action',
        'social-launch',
        'pitch-deck',
        'seo-brief',
        'support-kit',
      ])
    );
    expect(RUNNABLE_PACK_IDS).toHaveLength(7);
    expect(isRunnablePack('seo-brief')).toBe(true);
    expect(isRunnablePack('support-kit')).toBe(true);
    expect(isRunnablePack('unknown')).toBe(false);
  });

  it('content-studio yerel runner taslak + seo üretir', () => {
    const run = buildLocalContentStudioRun('AI keşif platformu blog yazısı', 'tr');
    expect(run.packId).toBe('content-studio');
    expect(run.draft.length).toBeGreaterThan(100);
    expect(formatContentStudioArtifact(run, 'tr')).toMatch(/SEO/);
  });

  it('sales-outreach e-posta serisi üretir', () => {
    const run = buildLocalSalesOutreachRun('B2B demo teklifi', 'tr');
    expect(run.sequence.length).toBe(3);
    expect(formatSalesOutreachArtifact(run, 'tr')).toMatch(/CRM/);
    expect(formatPackArtifact(run, 'tr')).toBe(formatSalesOutreachArtifact(run, 'tr'));
  });

  it('meeting-to-action özet + aksiyon üretir', () => {
    const run = buildLocalMeetingToActionRun('Sprint planlama', 'en');
    expect(run.actions.length).toBeGreaterThanOrEqual(2);
    expect(formatMeetingToActionArtifact(run, 'en')).toMatch(/Action items/i);
  });

  it('social-launch post + zamanlama üretir', () => {
    const run = buildLocalSocialLaunchRun('Yeni runner lansmanı', 'tr');
    expect(run.packId).toBe('social-launch');
    expect(run.posts.length).toBeGreaterThanOrEqual(2);
    expect(run.imagePrompts.length).toBeGreaterThanOrEqual(1);
    expect(formatSocialLaunchArtifact(run, 'tr')).toMatch(/Zamanlama|Post/);
  });

  it('pitch-deck slayt iskeleti üretir', () => {
    const run = buildLocalPitchDeckRun('job packs seed', 'en');
    expect(run.packId).toBe('pitch-deck');
    expect(run.slides.length).toBeGreaterThanOrEqual(7);
    expect(run.slides[0].bullets.length).toBeGreaterThan(0);
    expect(formatPitchDeckArtifact(run, 'en')).toMatch(/Slides/i);
    expect(formatPackArtifact(run, 'en')).toBe(formatPitchDeckArtifact(run, 'en'));
  });

  it('seo-brief çok adımlı artifact üretir', () => {
    const run = buildLocalSeoBriefRun('AI araç seçimi', 'tr');
    expect(run.packId).toBe('seo-brief');
    expect(run.steps.length).toBeGreaterThanOrEqual(4);
    expect(extractRunSteps(run).length).toBe(run.steps.length);
    expect(formatSeoBriefArtifact(run, 'tr')).toMatch(/Anahtar|Title|Brief/i);
    expect(formatPackArtifact(run, 'tr')).toBe(formatSeoBriefArtifact(run, 'tr'));
  });

  it('support-kit çok adımlı artifact üretir', () => {
    const run = buildLocalSupportKitRun('refund request', 'en');
    expect(run.packId).toBe('support-kit');
    expect(run.steps.length).toBeGreaterThanOrEqual(4);
    expect(formatSupportKitArtifact(run, 'en')).toMatch(/Macro|Tone|FAQ/i);
  });
});
