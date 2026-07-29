/**
 * Server-only: load anonymized receipt social-proof stats (cached).
 */

import 'server-only';

import logger from '@/utils/logger';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  buildReceiptSocialProofStats,
  toPublicReceiptSocialProof,
} from '@/lib/kasif/receiptSocialProof';

/** @type {{ at: number, payload: ReturnType<typeof toPublicReceiptSocialProof>, windowDays: number }|null} */
let cache = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * @param {{
 *   windowDays?: number,
 *   limit?: number,
 *   forceRefresh?: boolean,
 *   minVisible?: number,
 * }} [options]
 */
export async function getReceiptSocialProofStats(options = {}) {
  const windowDays = Math.min(90, Math.max(1, Number(options.windowDays) || 30));
  const limit = Math.min(2000, Math.max(50, Number(options.limit) || 800));
  const minVisible = options.minVisible;
  const now = Date.now();

  if (
    !options.forceRefresh &&
    cache &&
    cache.windowDays === windowDays &&
    now - cache.at < CACHE_TTL_MS
  ) {
    return { ...cache.payload, cached: true };
  }

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('kasif_interactions')
      .select('funnel, intent, created_at')
      .not('funnel', 'is', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn('[receipt-social-proof] load failed:', error.message || error);
      // Soft empty — UI shows empty state, not hard fail.
      const empty = toPublicReceiptSocialProof(
        buildReceiptSocialProofStats([], { windowDays, minVisible })
      );
      return { ...empty, cached: false, error: error.message || 'load_failed' };
    }

    const stats = buildReceiptSocialProofStats(data || [], {
      windowDays,
      minVisible,
      generatedAt: new Date(),
    });
    const payload = toPublicReceiptSocialProof(stats);
    cache = { at: now, payload, windowDays };
    return { ...payload, cached: false };
  } catch (error) {
    logger.warn('[receipt-social-proof] error:', error?.message || error);
    const empty = toPublicReceiptSocialProof(
      buildReceiptSocialProofStats([], { windowDays, minVisible })
    );
    return { ...empty, cached: false, error: error?.message || 'failed' };
  }
}

/** Test helper */
export function __resetReceiptSocialProofCacheForTests() {
  cache = null;
}
