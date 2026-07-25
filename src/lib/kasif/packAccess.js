/**
 * Pack Pro gate + free quota rules (pure, testable).
 */

import { JOB_PACKS, getJobPackById } from './jobPacks';

/** Free users may start this many proHint packs per rolling window. */
export const FREE_PRO_PACK_QUOTA = 2;

/** Rolling window days for free pro-pack quota. */
export const FREE_PRO_PACK_WINDOW_DAYS = 30;

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
