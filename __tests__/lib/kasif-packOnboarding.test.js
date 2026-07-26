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

  it('localStorage ile complete/dismiss ayırır', () => {
    const { getProPackOnboardingStatus } = require('../../src/lib/kasif/packOnboarding');
    expect(hasSeenProPackOnboarding()).toBe(false);
    markProPackOnboardingSeen('complete');
    expect(hasSeenProPackOnboarding()).toBe(true);
    expect(getProPackOnboardingStatus()).toBe('complete');
    expect(localStorage.getItem(PRO_PACK_ONBOARDING_KEY)).toBe('complete');
    resetProPackOnboardingForTests();
    markProPackOnboardingSeen('dismiss');
    expect(getProPackOnboardingStatus()).toBe('dismiss');
  });

  it('pickLocale çalışır', () => {
    expect(pickLocale({ tr: 'Merhaba', en: 'Hello' }, 'en')).toBe('Hello');
    expect(pickLocale({ tr: 'Merhaba', en: 'Hello' }, 'tr')).toBe('Merhaba');
  });
});
