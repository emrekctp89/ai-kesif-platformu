import 'server-only';

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  FREE_PRO_PACK_WINDOW_DAYS,
  evaluateAllPackAccess,
  evaluatePackAccess,
  isProPackId,
} from './packAccess';
import logger from '@/utils/logger';

export async function getViewerProState() {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isAuthenticated: false, isPro: false };
  }

  if (user.email && user.email === process.env.ADMIN_EMAIL) {
    return { user, isAuthenticated: true, isPro: true };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_price_id')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user,
    isAuthenticated: true,
    isPro: Boolean(profile?.stripe_price_id),
  };
}

/**
 * Count pro-pack job sessions for a user fingerprint in the rolling window.
 * Uses service role; fingerprints with user id when available, else skips quota attribution.
 */
export async function countProPackRunsForUser(userId) {
  if (!userId) return 0;
  try {
    const admin = createAdminClient();
    const since = new Date(
      Date.now() - FREE_PRO_PACK_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // intent.packId set + source pack|workmind; filter pro packs client-side if needed
    const { data, error } = await admin
      .from('kasif_interactions')
      .select('id, intent')
      .gte('created_at', since)
      .not('intent->packId', 'is', null)
      .limit(500);

    if (error || !data) {
      logger.warn('countProPackRunsForUser query issue:', error?.message);
      return 0;
    }

    return data.filter((row) => {
      if (row?.intent?.userId !== userId) return false;
      return isProPackId(row?.intent?.packId);
    }).length;
  } catch (error) {
    logger.warn('countProPackRunsForUser failed:', error?.message);
    return 0;
  }
}

/**
 * Count pack runs by matching intent.userId we stamp on pack sessions.
 * Also support counting anonymous quota via IP is intentionally not done (privacy).
 */
export async function getPackAccessSnapshot() {
  const viewer = await getViewerProState();
  let usedProPackRuns = 0;
  if (viewer.user?.id && !viewer.isPro) {
    usedProPackRuns = await countProPackRunsForUser(viewer.user.id);
  }

  const state = {
    isPro: viewer.isPro,
    isAuthenticated: viewer.isAuthenticated,
    usedProPackRuns,
  };

  return {
    ...state,
    userId: viewer.user?.id || null,
    packs: evaluateAllPackAccess(state),
    windowDays: FREE_PRO_PACK_WINDOW_DAYS,
  };
}

export async function assertPackAllowed(packId) {
  const snapshot = await getPackAccessSnapshot();
  const decision = evaluatePackAccess({
    packId,
    isPro: snapshot.isPro,
    isAuthenticated: snapshot.isAuthenticated,
    usedProPackRuns: snapshot.usedProPackRuns,
  });
  return { ...decision, userId: snapshot.userId, snapshot };
}
