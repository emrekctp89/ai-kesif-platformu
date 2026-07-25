const {
  DEFAULT_JOB_WIZARD,
  JOB_WIZARDS,
  listJobWizardGoalIds,
  resolveJobWizard,
} = require('../../src/lib/kasif/jobWizards');

describe('jobWizards', () => {
  it('en az 10 niş sihirbaz tanımlar', () => {
    expect(listJobWizardGoalIds().length).toBeGreaterThanOrEqual(10);
    expect(JOB_WIZARDS['presentation-creation']).toBeDefined();
    expect(JOB_WIZARDS['image-generation']).toBeDefined();
    expect(JOB_WIZARDS['workflow-automation']).toBeDefined();
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
