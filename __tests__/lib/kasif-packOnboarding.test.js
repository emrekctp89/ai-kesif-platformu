/**
 * @jest-environment jsdom
 */

const {
  PRO_PACK_ONBOARDING_STEPS,
  PRO_PACK_ONBOARDING_KEY,
  hasSeenProPackOnboarding,
  markProPackOnboardingSeen,
  resetProPackOnboardingForTests,
  pickLocale,
} = require('../../src/lib/kasif/packOnboarding');

describe('packOnboarding', () => {
  beforeEach(() => {
    resetProPackOnboardingForTests();
  });

  it('4 adımlık tur tanımlar', () => {
    expect(PRO_PACK_ONBOARDING_STEPS).toHaveLength(4);
    expect(PRO_PACK_ONBOARDING_STEPS.map((s) => s.id)).toEqual(['brief', 'run', 'copy', 'finish']);
  });

  it('localStorage ile görüldü işaretler', () => {
    expect(hasSeenProPackOnboarding()).toBe(false);
    markProPackOnboardingSeen();
    expect(hasSeenProPackOnboarding()).toBe(true);
    expect(localStorage.getItem(PRO_PACK_ONBOARDING_KEY)).toBe('1');
  });

  it('pickLocale çalışır', () => {
    expect(pickLocale({ tr: 'Merhaba', en: 'Hello' }, 'en')).toBe('Hello');
    expect(pickLocale({ tr: 'Merhaba', en: 'Hello' }, 'tr')).toBe('Merhaba');
  });
});
