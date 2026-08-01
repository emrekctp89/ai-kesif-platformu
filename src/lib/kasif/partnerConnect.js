/**
 * Post-runner “connect tool account” next steps (OAuth-free guidance).
 * Guides users from platform first_result → open catalog tool → sign up / OAuth on tool site.
 */

import { buildPackWorkmindUrl, getJobPackById } from './jobPacks';
import { formatKasifGoalLabel } from './goalLabels';

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   description: string,
 *   cta: string,
 *   href: string|null,
 *   external?: boolean,
 * }} PartnerConnectStep
 */

/**
 * Build ordered next steps after a pack runner completes.
 * @param {string} packId
 * @param {string} [locale]
 * @param {{ interactionId?: string, feedbackToken?: string }} [options]
 * @returns {PartnerConnectStep[]}
 */
export function buildPartnerConnectSteps(packId, locale = 'tr', options = {}) {
  const lang = locale === 'en' ? 'en' : 'tr';
  const pack = getJobPackById(packId, lang);
  const prefix = lang === 'en' ? '/en' : '';
  const goals = pack?.goals || [];
  const primaryGoal = goals[0] || '';
  const goalLabel =
    formatKasifGoalLabel(primaryGoal, lang) || (lang === 'en' ? 'this job' : 'bu görev');
  const askQ = encodeURIComponent(
    pack?.starterQuestion ||
      (lang === 'en' ? `Recommend tools for ${goalLabel}` : `${goalLabel} için araç öner`)
  );

  /** @type {PartnerConnectStep[]} */
  const steps = [
    {
      id: 'pick-tool',
      title: lang === 'en' ? '1. Pick a catalog tool' : '1. Katalogdan araç seç',
      description:
        lang === 'en'
          ? `Ask Kâşif for verified tools for “${goalLabel}”, then open the best match.`
          : `“${goalLabel}” için onaylı araçları Kâşif’e sor; en uygununu aç.`,
      cta: lang === 'en' ? 'Ask Kâşif' : 'Kâşif’e sor',
      href: `${prefix}/kasif?q=${askQ}`,
    },
    {
      id: 'connect-account',
      title: lang === 'en' ? '2. Create / sign in (OAuth)' : '2. Hesap oluştur / giriş (OAuth)',
      description:
        lang === 'en'
          ? 'On the tool’s site, complete signup or “Continue with Google/GitHub”. aikeşif does not store third-party tool tokens.'
          : 'Araç sitesinde kayıt ol veya “Google/GitHub ile devam et”. aikeşif üçüncü taraf araç token’ı saklamaz.',
      cta: lang === 'en' ? 'Browse tools' : 'Araçları keşfet',
      href: `${prefix}/kesfet`,
    },
    {
      id: 'paste-or-plan',
      title: lang === 'en' ? '3. Finish the job' : '3. İşi bitir',
      description:
        lang === 'en'
          ? 'Paste the tool’s first output into the result bridge, or continue step-by-step in Workmind.'
          : 'Aracın ilk çıktısını sonuç köprüsüne yapıştır veya Workmind’de adım adım sürdür.',
      cta: lang === 'en' ? 'Plan in Workmind' : 'Workmind’de planla',
      href: pack
        ? buildPackWorkmindUrl(pack, {
            locale: lang,
            interactionId: options.interactionId,
            feedbackToken: options.feedbackToken,
          })
        : `${prefix}/workmind`,
    },
  ];

  return steps;
}

/**
 * Client-safe summary of runner provider for badges.
 * @param {{ preferredSource?: string, configured?: boolean, hasGeminiFallback?: boolean, qualityMode?: string }|null} status
 * @param {string} [locale]
 */
export function describeRunnerProvider(status, locale = 'tr') {
  const lang = locale === 'en' ? 'en' : 'tr';
  const preferred = status?.preferredSource || 'local';
  if (preferred === 'deepseek') {
    return {
      level: 'deepseek',
      label: lang === 'en' ? 'DeepSeek superpower ready' : 'DeepSeek süper güç hazır',
      hint:
        lang === 'en'
          ? 'Admin can switch grounded Kâşif conversations to DeepSeek.'
          : 'Admin, grounded Kâşif sohbetlerini DeepSeek moduna geçirebilir.',
    };
  }
  if (preferred === 'partner') {
    return {
      level: 'partner',
      label: lang === 'en' ? 'Partner AI ready' : 'Partner AI hazır',
      hint:
        lang === 'en'
          ? 'Pack JSON uses the connected partner model first.'
          : 'Paket JSON önce bağlı partner modeliyle üretilir.',
    };
  }
  if (preferred === 'gemini') {
    return {
      level: 'gemini',
      label: lang === 'en' ? 'Gemini fallback ready' : 'Gemini yedek hazır',
      hint:
        lang === 'en'
          ? 'Partner not configured; Gemini will be used when available.'
          : 'Partner yapılandırılmadı; uygunsa Gemini kullanılır.',
    };
  }
  return {
    level: 'local',
    label: lang === 'en' ? 'Local draft mode' : 'Yerel taslak modu',
    hint:
      lang === 'en'
        ? 'No cloud LLM key — deterministic local templates still produce a first result.'
        : 'Bulut LLM anahtarı yok — yerel şablonlar yine ilk sonucu üretir.',
  };
}
