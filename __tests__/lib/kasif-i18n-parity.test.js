/**
 * EN/TR message key parity for Kâşif-related UI strings.
 */

const tr = require('../../messages/tr.json');
const en = require('../../messages/en.json');

function flattenKeys(obj, prefix = '') {
  const out = [];
  for (const key of Object.keys(obj || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...flattenKeys(value, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

function diffKeys(a, b) {
  const setB = new Set(b);
  return a.filter((key) => !setB.has(key)).sort();
}

describe('Kâşif i18n EN/TR parity', () => {
  it.each([
    ['Kasif', () => tr.Kasif, () => en.Kasif],
    ['Learn', () => tr.Learn, () => en.Learn],
    ['LearnKasif', () => tr.LearnKasif, () => en.LearnKasif],
    ['AdminClient', () => tr.AdminClient, () => en.AdminClient],
  ])('%s namespace keys match EN↔TR', (_name, trFn, enFn) => {
    const trKeys = flattenKeys(trFn() || {});
    const enKeys = flattenKeys(enFn() || {});
    expect(diffKeys(trKeys, enKeys)).toEqual([]);
    expect(diffKeys(enKeys, trKeys)).toEqual([]);
    expect(trKeys.length).toBeGreaterThan(10);
  });

  it('Kasif.packs keys match', () => {
    const trKeys = flattenKeys(tr.Kasif?.packs || {});
    const enKeys = flattenKeys(en.Kasif?.packs || {});
    expect(diffKeys(trKeys, enKeys)).toEqual([]);
    expect(diffKeys(enKeys, trKeys)).toEqual([]);
  });

  it('paywall + onboarding keys present in both locales', () => {
    const required = [
      'paywallLoginTitle',
      'paywallLoginBody',
      'paywallQuotaTitle',
      'paywallQuotaBody',
      'paywallSeeFree',
      'paywallTryFreeRunner',
      'paywallBenefits',
      'lockedHintLogin',
      'lockedHintQuota',
      'onboardingEyebrow',
      'onboardingTitle',
      'onboardingSubtitle',
      'onboardingNext',
      'onboardingDone',
      'onboardingSkip',
    ];
    for (const key of required) {
      expect(tr.Kasif.packs[key]).toBeTruthy();
      expect(en.Kasif.packs[key]).toBeTruthy();
      expect(String(tr.Kasif.packs[key]).length).toBeGreaterThan(3);
      expect(String(en.Kasif.packs[key]).length).toBeGreaterThan(3);
    }
  });

  it('Kasif soft-landing / add-tool keys match', () => {
    const subset = [
      'softLandingBadge',
      'softLandingCtaTitle',
      'softLandingHint',
      'softLandingHintB',
      'softLandingVariant',
      'addToolBadgeQueued',
      'addToolBadgeDuplicate',
      'addToolBadgeMissingUrl',
      'addToolBadgeError',
      'addToolAdminCta',
      'addToolAdminHint',
      'addToolSla',
      'addToolTryAgain',
    ];
    for (const key of subset) {
      expect(tr.Kasif[key]).toBeTruthy();
      expect(en.Kasif[key]).toBeTruthy();
    }
  });

  it('AdminClient kasif metric keys match for pro onboarding', () => {
    const keys = [
      'kasifProOnboardingTitle',
      'kasifProOnboardingDesc',
      'kasifProOnboardingComplete',
      'kasifProOnboardingDismiss',
      'kasifProOnboardingNone',
      'kasifProOnboardingFrOfComplete',
      'kasifProOnboardingCompleteShareFr',
      'kasifSoftVariantBuckets',
      'kasifSoftWinnerBadge',
      'kasifSoftWinnerLead',
      'kasifSoftWinnerTie',
      'kasifSoftWinnerNeedSample',
      'kasifSoftWinnerPending',
      'kasifSoftPinActive',
      'kasifSoftPinEnvForce',
      'kasifSoftPinInactive',
      'kasifSoftPinWinnerCta',
      'kasifSoftPinClearCta',
      'kasifSoftPinHint',
      'kasifSoftPinSaved',
      'kasifSoftPinCleared',
      'kasifSoftPinFailed',
      'alertsOpenApprovalQueue',
    ];
    for (const key of keys) {
      expect(tr.AdminClient[key]).toBeTruthy();
      expect(en.AdminClient[key]).toBeTruthy();
    }
  });

  it('LearnKasif core keys are non-empty', () => {
    const required = [
      'metaTitle',
      'title',
      'subtitle',
      'modulesHeading',
      'outcomesHeading',
      'ctaLiveKasif',
      'completeTitle',
    ];
    for (const key of required) {
      expect(String(tr.LearnKasif[key] || '').length).toBeGreaterThan(3);
      expect(String(en.LearnKasif[key] || '').length).toBeGreaterThan(3);
    }
  });
});
