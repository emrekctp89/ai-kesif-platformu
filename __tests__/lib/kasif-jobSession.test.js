const {
  buildWorkmindHandoffUrl,
  createJobSession,
  getJobSessionProgress,
  jobSessionFromWorkflow,
  markJobSessionStepDone,
  selectToolForJobStep,
} = require('../../src/lib/kasif/jobSession');

describe('jobSession', () => {
  it('workflow node’larından oturum üretir', () => {
    const session = jobSessionFromWorkflow(
      'Ücretsiz sunum hazırla',
      [
        { id: 'step-1', label: 'Brief', description: 'Mesaj', categorySlug: 'uretkenlik' },
        { id: 'step-2', label: 'Slayt', description: 'Tasarla', categorySlug: 'tasarim' },
      ],
      { goals: ['presentation-creation'], source: 'workmind' }
    );

    expect(session.prompt).toMatch(/sunum/i);
    expect(session.goals).toEqual(['presentation-creation']);
    expect(session.steps).toHaveLength(2);
    expect(getJobSessionProgress(session)).toEqual({
      total: 2,
      done: 0,
      percent: 0,
      nextStep: expect.objectContaining({ id: 'step-1' }),
      complete: false,
    });
  });

  it('adım tamamlamayı ve araç seçimini izler', () => {
    let session = createJobSession({
      prompt: 'Logo yap',
      goals: ['logo-design'],
      steps: [
        { id: 'a', label: 'Brief' },
        { id: 'b', label: 'Üret' },
      ],
    });
    session = markJobSessionStepDone(session, 'a');
    session = selectToolForJobStep(session, 'b', { id: 9, slug: 'logo-ai', name: 'Logo AI' });

    expect(session.steps[0].done).toBe(true);
    expect(session.steps[1].selectedTool).toEqual({
      id: 9,
      slug: 'logo-ai',
      name: 'Logo AI',
    });
    expect(getJobSessionProgress(session).percent).toBe(50);

    session = markJobSessionStepDone(session, 'b');
    expect(getJobSessionProgress(session).complete).toBe(true);
  });

  it('Kâşif → Workmind handoff URL üretir', () => {
    const url = buildWorkmindHandoffUrl('Sunum hazırla lütfen', {
      locale: 'tr',
      from: 'kasif',
      interactionId: 'int-1',
      feedbackToken: 'tok-1',
      goals: ['presentation-creation'],
      autoGenerate: true,
    });
    expect(url.startsWith('/workmind?')).toBe(true);
    expect(url).toContain('from=kasif');
    expect(url).toContain('interactionId=int-1');
    expect(url).toContain('auto=1');
    expect(url).toContain('presentation-creation');
  });
});
