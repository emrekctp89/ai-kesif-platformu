const { formatKasifGoalLabel, formatKasifGoalLabels } = require('../kasif/goalLabels');

describe('formatKasifGoalLabel', () => {
  it('maps known goals for tr and en', () => {
    expect(formatKasifGoalLabel('presentation-creation', 'tr')).toBe('Sunum');
    expect(formatKasifGoalLabel('presentation-creation', 'en')).toBe('Presentation');
    expect(formatKasifGoalLabel('coding-assistant', 'tr')).toBe('Kod asistanı');
  });

  it('falls back to raw goal id when unknown', () => {
    expect(formatKasifGoalLabel('unknown-goal', 'tr')).toBe('unknown-goal');
  });

  it('formats goal lists', () => {
    expect(formatKasifGoalLabels(['seo-optimization', 'email-writing'], 'tr')).toEqual([
      'SEO',
      'E-posta yazımı',
    ]);
  });
});
