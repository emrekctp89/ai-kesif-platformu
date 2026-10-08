const {
  LEARNING_JOURNEYS,
  LESSON_IDS,
  filterJourneys,
  normalizeLearningState,
} = require('../../src/lib/learn/journeys');

test('eight routes contain usable bilingual lessons and a review', () => {
  expect(new Set(LEARNING_JOURNEYS.map((route) => route.id)).size).toBe(8);
  for (const route of LEARNING_JOURNEYS) {
    for (const locale of ['tr', 'en']) {
      for (const field of ['title', 'outcome', 'concept', 'exercise', 'prompt', 'question'])
        expect(route[field][locale].length).toBeGreaterThan(15);
      expect(route.checks.every((check) => check[locale])).toBe(true);
      expect(route.options).toHaveLength(2);
    }
  }
  expect(LESSON_IDS).toHaveLength(3);
});

test('filters combine search, difficulty, time and saved state', () => {
  expect(
    filterJourneys(LEARNING_JOURNEYS, { level: 'beginner', duration: 'short' }).every(
      (route) => route.level === 'beginner' && route.minutes <= 25
    )
  ).toBe(true);
  expect(
    filterJourneys(LEARNING_JOURNEYS, { query: 'gorSEL' }, 'tr').map((route) => route.id)
  ).toContain('gorsel-uretim');
  expect(
    filterJourneys(LEARNING_JOURNEYS, { savedOnly: true, saved: ['ses-muzik'] }).map(
      (route) => route.id
    )
  ).toEqual(['ses-muzik']);
  expect(
    filterJourneys(LEARNING_JOURNEYS, { query: 'test coding' }, 'en').length
  ).toBeLessThanOrEqual(1);
});

test('restored data rejects invalid lesson ids and bounds notes', () => {
  const state = normalizeLearningState({
    completed: {
      'chatbotlar:understand': true,
      'fake:review': true,
      'chatbotlar:practice': 'true',
    },
    saved: ['chatbotlar', 'fake', 'chatbotlar'],
    active: 'fake',
    lesson: 'fake',
    notes: { chatbotlar: 'x'.repeat(4000), fake: 'no', 'ses-muzik': 42 },
  });
  expect(state.completed).toEqual({ 'chatbotlar:understand': true });
  expect(state.saved).toEqual(['chatbotlar']);
  expect(state.notes.chatbotlar).toHaveLength(3000);
  expect(Object.keys(state.notes)).toEqual(['chatbotlar']);
  expect(state.active).toBeNull();
  expect(state.lesson).toBe('understand');
  expect(normalizeLearningState(null).completed).toEqual({});
});
