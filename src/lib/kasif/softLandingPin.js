/**
 * Ops pin for soft-landing A/B winner (DB-backed, env-free).
 * Priority when resolving: env FORCE > ops pin > env DEFAULT > ab split.
 */

import 'server-only';

import logger from '@/utils/logger';
import { createAdminClient } from '@/utils/supabase/admin';
import { normalizeSoftLandingPinVariant, parseSoftLandingPinRow } from '@/lib/kasif/softLanding';

export const SOFT_LANDING_PIN_KEY = 'kasif_soft_landing_pin';
export { normalizeSoftLandingPinVariant, parseSoftLandingPinRow };

/** @type {{ variant: 'A'|'B'|null, pinnedAt: string|null, note: string|null, source: string }|null} */
let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 30_000;

/**
 * @param {{ forceRefresh?: boolean }} [options]
 * @returns {Promise<{ variant: 'A'|'B'|null, pinnedAt: string|null, note: string|null, source: string }>}
 */
export async function getSoftLandingOpsPin(options = {}) {
  const now = Date.now();
  if (!options.forceRefresh && cache && now - cacheAt < CACHE_TTL_MS) {
    return cache;
  }

  const empty = { variant: null, pinnedAt: null, note: null, source: 'app_settings' };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('app_settings')
      .select('key, value, updated_at')
      .eq('key', SOFT_LANDING_PIN_KEY)
      .maybeSingle();

    if (error) {
      // Table may not exist yet — treat as unpinned.
      logger.warn('soft-landing ops pin read failed:', error.message || error);
      cache = empty;
      cacheAt = now;
      return empty;
    }

    const parsed = data ? parseSoftLandingPinRow(data) : empty;
    cache = parsed;
    cacheAt = now;
    return parsed;
  } catch (error) {
    logger.warn('soft-landing ops pin read error:', error?.message || error);
    cache = empty;
    cacheAt = now;
    return empty;
  }
}

/**
 * @param {'A'|'B'|null} variant null clears pin
 * @param {{ userId?: string|null, note?: string|null }} [options]
 */
export async function setSoftLandingOpsPin(variant, options = {}) {
  const pin = normalizeSoftLandingPinVariant(variant);
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (!pin) {
    const { error } = await admin.from('app_settings').delete().eq('key', SOFT_LANDING_PIN_KEY);
    if (error) throw error;
    cache = { variant: null, pinnedAt: null, note: null, source: 'app_settings' };
    cacheAt = Date.now();
    return cache;
  }

  const payload = {
    key: SOFT_LANDING_PIN_KEY,
    value: {
      variant: pin,
      pinnedAt: now,
      note: options.note ? String(options.note).slice(0, 280) : null,
    },
    updated_at: now,
    updated_by: options.userId || null,
  };

  const { data, error } = await admin
    .from('app_settings')
    .upsert(payload, { onConflict: 'key' })
    .select('key, value, updated_at')
    .single();

  if (error) throw error;

  const parsed = parseSoftLandingPinRow(data);
  cache = parsed;
  cacheAt = Date.now();
  return parsed;
}

/** Test helper — clear module cache between cases. */
export function __resetSoftLandingPinCacheForTests() {
  cache = null;
  cacheAt = 0;
}
