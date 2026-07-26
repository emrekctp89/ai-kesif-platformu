const {
  DEFAULT_JOB_WIZARD,
  JOB_WIZARDS,
  listJobWizardGoalIds,
  resolveJobWizard,
} = require('../../src/lib/kasif/jobWizards');
const { GOAL_LABELS } = require('../../src/lib/kasif/goalLabels');

describe('jobWizards', () => {
  it('tüm goal label anahtarları için sihirbaz tanımlar', () => {
    const wizardIds = listJobWizardGoalIds();
    const goalIds = Object.keys(GOAL_LABELS.tr);
    expect(wizardIds.length).toBeGreaterThanOrEqual(22);
    for (const goal of goalIds) {
      expect(JOB_WIZARDS[goal]).toBeDefined();
      expect(JOB_WIZARDS[goal].steps.length).toBeGreaterThanOrEqual(3);
      expect(JOB_WIZARDS[goal].prompts?.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('niş sihirbazlar (video, music, legal, 3d) lokalize edilir', () => {
    expect(resolveJobWizard(['video-generation'], 'tr').title).toMatch(/video/i);
    expect(resolveJobWizard(['music-generation'], 'en').title).toMatch(/music/i);
    expect(resolveJobWizard(['legal-review'], 'tr').title).toMatch(/hukuk/i);
    expect(resolveJobWizard(['three-d-generation'], 'en').title).toMatch(/3d/i);
  });

  it('goal sırasına göre doğru sihirbazı seçer', () => {
    const wizard = resolveJobWizard(['unknown-goal', 'presentation-creation'], 'tr');
    expect(wizard.id).toBe('presentation-creation');
    expect(wizard.title).toMatch(/sunum/i);
    expect(wizard.steps.length).toBeGreaterThanOrEqual(3);
    expect(wizard.prompts[0].body).toMatch(/Konu:/);
  });

  it('goal yoksa varsayılan sihirbazı döner', () => {
    const wizard = resolveJobWizard([], 'en');
    expect(wizard.id).toBe(DEFAULT_JOB_WIZARD.id);
    expect(wizard.steps[0].label).toMatch(/Open the tool/i);
  });

  it('İngilizce locale metinlerini seçer', () => {
    const wizard = resolveJobWizard(['email-writing'], 'en');
    expect(wizard.id).toBe('email-writing');
    expect(wizard.title).toMatch(/Email/i);
    expect(wizard.prompts[0].title).toMatch(/Cold email/i);
  });
});
