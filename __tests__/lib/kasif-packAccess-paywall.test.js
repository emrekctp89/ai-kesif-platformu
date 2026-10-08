const { buildPackPaywall, listFreeRunnablePackIds } = require('../../src/lib/kasif/packAccess');
test('no free runners are advertised', () => {
  expect(listFreeRunnablePackIds()).toEqual([]);
});
test.each(['tr', 'en'])('paywall keeps basic chat open in %s', (locale) => {
  const prefix = locale === 'en' ? '/en' : '';
  const wall = buildPackPaywall(locale);
  expect(wall.ctaHref).toBe(prefix + '/uyelik');
  expect(wall.secondaryHref).toBe(prefix + '/kasif');
  expect(wall.secondaryKey).toBe('packs.chatCta');
});
