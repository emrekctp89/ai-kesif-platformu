const { answerPlatformQuestion } = require('../../src/lib/kasif/platformAssistant');
test.each(['WorkMind nedir?', 'PRO üyelik neleri içeriyor?', 'İş paketleri ücretsiz mi?'])(
  'platform assistant explains PRO for %s',
  (q) => {
    const r = answerPlatformQuestion(q);
    expect(r.answer).toContain('PRO');
    expect(r.answer).toContain('herkese');
    expect(r.meta).toBe(true);
  }
);
test('English categories help', () => {
  expect(answerPlatformQuestion('How do categories work?', 'en').answer).toContain('Categories');
});
test('tool discovery is preserved', () => {
  expect(answerPlatformQuestion('Sunum aracı öner')).toBeNull();
});
