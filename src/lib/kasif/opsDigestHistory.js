/**
 * Server-only: persist last Kâşif ops digest snapshot in app_settings.
 */

import 'server-only';

import logger from '@/utils/logger';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  OPS_DIGEST_HISTORY_KEY,
  OPS_DIGEST_HISTORY_MAX,
  appendOpsDigestHistory,
  buildOpsDigestHistoryRecord,
  parseOpsDigestHistoryRow,
} from '@/lib/kasif/opsDigest';

/**
 * @returns {Promise<ReturnType<typeof parseOpsDigestHistoryRow>>}
 */
export async function getOpsDigestHistory() {
  const empty = parseOpsDigestHistoryRow(null);
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('app_settings')
      .select('key, value, updated_at')
      .eq('key', OPS_DIGEST_HISTORY_KEY)
      .maybeSingle();

    if (error) {
      logger.warn('[ops-digest-history] read failed:', error.message || error);
      return empty;
    }
    return parseOpsDigestHistoryRow(data);
  } catch (error) {
    logger.warn('[ops-digest-history] read error:', error?.message || error);
    return empty;
  }
}

/**
 * Save a successful digest run (skipped for dryRun by caller if desired).
 *
 * @param {object} snapshot
 * @param {{
 *   subject?: string|null,
 *   emailSent?: boolean,
 *   emailReason?: string|null,
 *   dryRun?: boolean,
 *   max?: number,
 * }} [meta]
 */
export async function saveOpsDigestHistory(snapshot, meta = {}) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { ok: false, error: 'missing_snapshot' };
  }

  const savedAt = new Date().toISOString();
  const record = buildOpsDigestHistoryRecord(snapshot, {
    savedAt,
    subject: meta.subject,
    emailSent: meta.emailSent,
    emailReason: meta.emailReason,
    dryRun: meta.dryRun,
  });

  try {
    const existing = await getOpsDigestHistory();
    const next = appendOpsDigestHistory(existing, record, {
      max: meta.max || OPS_DIGEST_HISTORY_MAX,
    });

    const admin = createAdminClient();
    const { error } = await admin.from('app_settings').upsert(
      {
        key: OPS_DIGEST_HISTORY_KEY,
        value: {
          version: next.version,
          last: next.last,
          history: next.history,
          updatedAt: next.updatedAt,
        },
        updated_at: savedAt,
        updated_by: null,
      },
      { onConflict: 'key' }
    );

    if (error) {
      logger.warn('[ops-digest-history] save failed:', error.message || error);
      return { ok: false, error: error.message || 'save_failed' };
    }

    return { ok: true, history: next };
  } catch (error) {
    logger.warn('[ops-digest-history] save error:', error?.message || error);
    return { ok: false, error: error?.message || 'save_failed' };
  }
}
