/**
 * Pack Pro gate + free quota rules (pure, testable).
 */

import { JOB_PACKS, getJobPackById, isRunnablePack, RUNNABLE_PACK_IDS } from './jobPacks';

/** Free users may start this many proHint packs per rolling window. */
export const FREE_PRO_PACK_QUOTA = 2;

/** Rolling window days for free pro-pack quota. */
export const FREE_PRO_PACK_WINDOW_DAYS = 30;

/** Runnable packs that do not require Pro / free-quota. */
export function listFreeRunnablePackIds() {
  return RUNNABLE_PACK_IDS.filter((id) => {
    const pack = JOB_PACKS.find((item) => item.id === id);
    return pack && !pack.proHint && isRunnablePack(id);
  });
}

/**
 * Paths + copy keys for locked Pro pack / runner paywall.
 * @param {string} [locale]
 * @param {string} [reason] login_required | pro_required
 * @param {{ packId?: string }} [options]
 */
export function buildPackPaywall(locale = 'tr', reason = 'pro_required', options = {}) {
  const lang = locale === 'en' ? 'en' : 'tr';
  const prefix = lang === 'en' ? '/en' : '';
  const freeAlts = listFreeRunnablePackIds().slice(0, 3);
  const freePackHref = freeAlts[0]
    ? `${prefix}/kasif?pack=${encodeURIComponent(freeAlts[0])}&runner=1`
    : `${prefix}/kasif`;

  if (reason === 'login_required') {
    const next = encodeURIComponent(`${prefix}/kasif`);
    return {
      reason: 'login_required',
      titleKey: 'packs.paywallLoginTitle',
      bodyKey: 'packs.paywallLoginBody',
      ctaKey: 'packs.loginCta',
      ctaHref: `${prefix}/login?next=${next}`,
      secondaryKey: 'packs.paywallSeeFree',
      secondaryHref: freePackHref,
      freePackIds: freeAlts,
      upgradePath: `${prefix}/login?next=${next}`,
    };
  }

  return {
    reason: 'pro_required',
    titleKey: 'packs.paywallQuotaTitle',
    bodyKey: 'packs.paywallQuotaBody',
    ctaKey: 'packs.upgradeCta',
    ctaHref: `${prefix}/uyelik`,
    secondaryKey: 'packs.paywallTryFreeRunner',
    secondaryHref: freePackHref,
    freePackIds: freeAlts,
    upgradePath: `${prefix}/uyelik`,
    freeRunsLeft: 0,
    packId: options.packId || null,
  };
}

export function isProPackId(packId) {
  const pack = JOB_PACKS.find((item) => item.id === String(packId || '').trim());
  return Boolean(pack?.proHint);
}

export function listProPackIds() {
  return JOB_PACKS.filter((pack) => pack.proHint).map((pack) => pack.id);
}

/**
 * @param {{
 *   isPro?: boolean,
 *   isAuthenticated?: boolean,
 *   packId: string,
 *   usedProPackRuns?: number,
 * }} input
 */
export function evaluatePackAccess(input = {}) {
  const packId = String(input.packId || '').trim();
  const pack = getJobPackById(packId, 'tr') || JOB_PACKS.find((p) => p.id === packId);
  if (!packId || !pack) {
    return {
      allowed: false,
      reason: 'unknown_pack',
      packId: packId || null,
      isProPack: false,
      freeRunsLeft: 0,
    };
  }

  const isProPack = Boolean(pack.proHint);
  const isPro = Boolean(input.isPro);
  const isAuthenticated = Boolean(input.isAuthenticated);
  const used = Math.max(0, Number(input.usedProPackRuns) || 0);
  const freeRunsLeft = Math.max(0, FREE_PRO_PACK_QUOTA - used);

  if (!isProPack) {
    return {
      allowed: true,
      reason: 'free_pack',
      packId,
      isProPack: false,
      freeRunsLeft: null,
      isPro,
      isAuthenticated,
    };
  }

  if (isPro) {
    return {
      allowed: true,
      reason: 'pro_member',
      packId,
      isProPack: true,
      freeRunsLeft: null,
      isPro: true,
      isAuthenticated,
    };
  }

  // Guests: pro packs require login (then free quota applies).
  if (!isAuthenticated) {
    return {
      allowed: false,
      reason: 'login_required',
      packId,
      isProPack: true,
      freeRunsLeft: FREE_PRO_PACK_QUOTA,
      isPro: false,
      isAuthenticated: false,
    };
  }

  if (freeRunsLeft > 0) {
    return {
      allowed: true,
      reason: 'free_quota',
      packId,
      isProPack: true,
      freeRunsLeft,
      isPro: false,
      isAuthenticated: true,
    };
  }

  return {
    allowed: false,
    reason: 'pro_required',
    packId,
    isProPack: true,
    freeRunsLeft: 0,
    isPro: false,
    isAuthenticated: true,
  };
}

/**
 * Build access map for all packs.
 */
export function evaluateAllPackAccess(state = {}) {
  return Object.fromEntries(
    JOB_PACKS.map((pack) => [
      pack.id,
      evaluatePackAccess({
        packId: pack.id,
        isPro: state.isPro,
        isAuthenticated: state.isAuthenticated,
        usedProPackRuns: state.usedProPackRuns,
      }),
    ])
  );
}
