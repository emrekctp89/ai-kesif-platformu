const {
  KASIF_LEARN_MODULES,
  KASIF_LEARN_OUTCOMES,
  buildLearnHref,
  getKasifLearnModuleIds,
  pickLocale,
} = require('../../src/lib/learn/kasifJobCompletionPath');

describe('kasifJobCompletionPath', () => {
  it('8 modül ve benzersiz id tanımlar', () => {
    expect(KASIF_LEARN_MODULES.length).toBe(8);
    const ids = getKasifLearnModuleIds();
    expect(new Set(ids).size).toBe(8);
    expect(ids).toEqual(
      expect.arrayContaining([
        'mindset',
        'ask',
        'wizard',
        'packs',
        'bridge',
        'add-tool',
        'capstone',
      ])
    );
  });

  it('her modülde learn + practice href vardır', () => {
    for (const mod of KASIF_LEARN_MODULES) {
      expect(mod.learn.length).toBeGreaterThanOrEqual(2);
      expect(mod.practice.href).toMatch(/^\//);
      expect(pickLocale(mod.title, 'tr')).toBeTruthy();
      expect(pickLocale(mod.title, 'en')).toBeTruthy();
      expect(pickLocale(mod.practice.cta, 'tr')).toBeTruthy();
    }
  });

  it('en az 4 öğrenme çıktısı vardır', () => {
    expect(KASIF_LEARN_OUTCOMES.length).toBeGreaterThanOrEqual(4);
  });

  it('buildLearnHref locale ve query ekler', () => {
    expect(buildLearnHref('/kasif', 'tr')).toBe('/kasif');
    expect(buildLearnHref('/kasif', 'en', 'hello')).toBe('/en/kasif?q=hello');
    expect(buildLearnHref('/workmind', 'tr')).toBe('/workmind');
  });
});
