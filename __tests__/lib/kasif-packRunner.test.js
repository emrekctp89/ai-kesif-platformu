const {
  buildLocalContentStudioRun,
  formatContentStudioArtifact,
  isRunnablePack,
} = require('../../src/lib/kasif/packRunner');

describe('packRunner', () => {
  it('yalnızca content-studio runnable', () => {
    expect(isRunnablePack('content-studio')).toBe(true);
    expect(isRunnablePack('sales-outreach')).toBe(false);
  });

  it('yerel runner taslak + seo üretir', () => {
    const run = buildLocalContentStudioRun('AI keşif platformu blog yazısı', 'tr');
    expect(run.packId).toBe('content-studio');
    expect(run.draft.length).toBeGreaterThan(100);
    expect(run.imagePrompt).toMatch(/AI keşif/i);
    expect(run.seo.title).toBeTruthy();
    const text = formatContentStudioArtifact(run, 'tr');
    expect(text).toMatch(/Görsel prompt/);
    expect(text).toMatch(/SEO/);
  });
});
