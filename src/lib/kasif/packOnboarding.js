/**
 * First-run Pro pack tour (client localStorage).
 * Pure helpers — no React.
 */

export const PRO_PACK_ONBOARDING_KEY = 'kasif-pro-pack-onboarding-v1';

/** @typedef {{ id: string, title: { tr: string, en: string }, body: { tr: string, en: string } }} OnboardingStep */

/** @type {OnboardingStep[]} */
export const PRO_PACK_ONBOARDING_STEPS = [
  {
    id: 'brief',
    title: { tr: '1. Kısa brief yaz', en: '1. Write a short brief' },
    body: {
      tr: 'Ne üreteceğini 1–2 cümlede yaz. Ne kadar net olursan çıktı o kadar işe yarar.',
      en: 'Describe what you need in 1–2 sentences. Clearer briefs produce better first outputs.',
    },
  },
  {
    id: 'run',
    title: { tr: '2. Runner’ı çalıştır', en: '2. Run the pack' },
    body: {
      tr: 'Platformda first_result üretilir (Partner → Gemini → yerel). Pro deneme kotan 30 günde 2 hak.',
      en: 'We generate a first_result on-platform (Partner → Gemini → local). Free Pro trials: 2 per 30 days.',
    },
  },
  {
    id: 'copy',
    title: { tr: '3. Kopyala veya adımları kullan', en: '3. Copy or use the steps' },
    body: {
      tr: 'Çok adımlı paketlerde her adımı tek tek kopyalayabilirsin. Tüm metni panoya da al.',
      en: 'Multi-step packs let you copy each step. You can also copy the full artifact.',
    },
  },
  {
    id: 'finish',
    title: { tr: '4. Araçta bitir', en: '4. Finish in a tool' },
    body: {
      tr: 'Sonraki adım: katalog aracı seç, hesabını bağla, Workmind veya paste bridge ile işi kapat.',
      en: 'Next: pick a catalog tool, sign in there, finish via Workmind or the paste bridge.',
    },
  },
];

export function pickLocale(value, locale = 'tr') {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return locale === 'en' ? value.en || value.tr : value.tr || value.en;
}

/**
 * @returns {null|'complete'|'dismiss'}
 */
export function getProPackOnboardingStatus() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = String(localStorage.getItem(PRO_PACK_ONBOARDING_KEY) || '').trim();
    if (raw === 'complete' || raw === '1') return 'complete';
    if (raw === 'dismiss') return 'dismiss';
    return null;
  } catch {
    return null;
  }
}

export function hasSeenProPackOnboarding() {
  return getProPackOnboardingStatus() != null;
}

/**
 * @param {'complete'|'dismiss'} [how]
 */
export function markProPackOnboardingSeen(how = 'complete') {
  if (typeof window === 'undefined') return;
  try {
    const value = how === 'dismiss' ? 'dismiss' : 'complete';
    localStorage.setItem(PRO_PACK_ONBOARDING_KEY, value);
  } catch {
    /* private mode */
  }
}

export function resetProPackOnboardingForTests() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PRO_PACK_ONBOARDING_KEY);
  } catch {
    /* ignore */
  }
}
