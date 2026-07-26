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
      'alertsOpenApprovalQueue',
    ];
    for (const key of keys) {
      expect(tr.AdminClient[key]).toBeTruthy();
      expect(en.AdminClient[key]).toBeTruthy();
    }
  });
});
