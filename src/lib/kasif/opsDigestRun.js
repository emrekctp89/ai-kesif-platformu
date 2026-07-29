/**
 * Server-only: load Kâşif interactions, build weekly ops digest, optional Resend email.
 */

import 'server-only';

import logger from '@/utils/logger';
import { createAdminClient } from '@/utils/supabase/admin';
import { buildKasifQualityStats } from '@/lib/kasif/qualityStats';
import { getSoftLandingOpsPin } from '@/lib/kasif/softLandingPin';
import {
  buildOpsDigestHistorySummary,
  buildOpsDigestSnapshot,
  buildOpsDigestWeekDelta,
  formatOpsDigestHtml,
  formatOpsDigestSubject,
  formatOpsDigestText,
  isOpsDigestNotifyEnabled,
} from '@/lib/kasif/opsDigest';

/**
 * Read soft-landing env force/default without importing client resolve helpers that need window.
 * @returns {{ envForce: string|null, envDefault: string|null }}
 */
function readSoftLandingEnvPins() {
  const force =
    process.env.KASIF_SOFT_LANDING_FORCE_VARIANT ||
    process.env.NEXT_PUBLIC_KASIF_SOFT_LANDING_FORCE_VARIANT ||
    '';
  const def =
    process.env.KASIF_SOFT_LANDING_DEFAULT_VARIANT ||
    process.env.NEXT_PUBLIC_KASIF_SOFT_LANDING_DEFAULT_VARIANT ||
    '';
  const normalize = (raw) => {
    const v = String(raw || '')
      .trim()
      .toUpperCase();
    if (v === 'A' || v === 'B') return v;
    if (v === 'AB') return 'ab';
    return raw ? String(raw).trim() : null;
  };
  return {
    envForce: normalize(force),
    envDefault: normalize(def) || (def ? String(def).trim() : null),
  };
}

/**
 * @param {{
 *   windowDays?: number,
 *   limit?: number,
 *   dryRun?: boolean,
 *   forceSend?: boolean,
 * }} [options]
 */
export async function runKasifOpsDigest(options = {}) {
  const windowDays = Math.min(90, Math.max(1, Number(options.windowDays) || 7));
  const limit = Math.min(2000, Math.max(50, Number(options.limit) || 500));
  const dryRun = options.dryRun === true;
  const forceSend = options.forceSend === true;

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();

  const { data: interactions, error } = await admin
    .from('kasif_interactions')
    .select('id, question, answer, intent, confidence, feedback, source_ids, funnel, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('[kasif-ops-digest] load interactions failed:', error.message || error);
    return {
      ok: false,
      error: error.message || 'interactions_load_failed',
      windowDays,
    };
  }

  const rows = Array.isArray(interactions) ? interactions : [];
  const stats = buildKasifQualityStats(rows, { windowDays, sampleLimit: 8 });

  let pin = { variant: null, pinnedAt: null, note: null, source: 'app_settings' };
  try {
    pin = await getSoftLandingOpsPin({ forceRefresh: true });
  } catch (pinError) {
    logger.warn('[kasif-ops-digest] soft-landing pin read failed:', pinError?.message || pinError);
  }

  const envPins = readSoftLandingEnvPins();

  /** Non-secret partner health (never includes API keys). */
  let partnerStatus = null;
  try {
    const { partnerRunnerStatus } = await import('@/lib/kasif/partnerRunner');
    partnerStatus = partnerRunnerStatus();
  } catch (partnerError) {
    logger.warn('[kasif-ops-digest] partner status failed:', partnerError?.message || partnerError);
  }

  const snapshot = buildOpsDigestSnapshot(
    stats,
    {
      variant: pin?.variant ?? null,
      pinnedAt: pin?.pinnedAt ?? null,
      note: pin?.note ?? null,
      source: pin?.source || 'app_settings',
      envForce: envPins.envForce,
      envDefault: envPins.envDefault,
    },
    { windowDays, generatedAt: new Date(), partnerStatus }
  );

  // WoW: compare this run against the last saved history entry (before we overwrite).
  /** @type {ReturnType<typeof buildOpsDigestWeekDelta>|null} */
  let weekDelta = null;
  try {
    const { getOpsDigestHistory } = await import('@/lib/kasif/opsDigestHistory');
    const prior = await getOpsDigestHistory();
    const previous = prior.history?.[0] || prior.last || null;
    const currentSummary = buildOpsDigestHistorySummary(snapshot);
    weekDelta = buildOpsDigestWeekDelta(currentSummary, previous);
  } catch (deltaError) {
    logger.warn('[kasif-ops-digest] weekDelta failed:', deltaError?.message || deltaError);
  }

  const formatOpts = { weekDelta };
  const subject = formatOpsDigestSubject(snapshot, formatOpts);
  const text = formatOpsDigestText(snapshot, formatOpts);
  const html = formatOpsDigestHtml(snapshot, formatOpts);

  const notifyEnabled = forceSend || isOpsDigestNotifyEnabled();
  let email = { sent: false, reason: dryRun ? 'dry_run' : notifyEnabled ? null : 'disabled' };

  if (!dryRun && notifyEnabled) {
    email = await sendOpsDigestEmail({ subject, text, html });
  }

  /** @type {{ ok: boolean, error?: string, history?: object }|null} */
  let history = null;
  if (!dryRun) {
    try {
      const { saveOpsDigestHistory } = await import('@/lib/kasif/opsDigestHistory');
      history = await saveOpsDigestHistory(snapshot, {
        subject,
        emailSent: email.sent,
        emailReason: email.reason || null,
        dryRun: false,
      });
    } catch (historyError) {
      logger.warn('[kasif-ops-digest] history save failed:', historyError?.message || historyError);
      history = { ok: false, error: historyError?.message || 'history_failed' };
    }
  }

  logger.info('[kasif-ops-digest] completed', {
    windowDays,
    total: snapshot.quality.total,
    firstResult: snapshot.funnel.counts.first_result,
    jobDone: snapshot.funnel.counts.job_done,
    packRuns: snapshot.packRoi.runs,
    pinEffective: snapshot.softLanding.pin.effective,
    emailSent: email.sent,
    emailReason: email.reason || null,
    historyOk: history?.ok ?? null,
    weekDelta: weekDelta?.available
      ? {
          fr: weekDelta.firstResult?.delta,
          done: weekDelta.jobDone?.delta,
        }
      : null,
  });

  return {
    ok: true,
    windowDays,
    rowCount: rows.length,
    snapshot,
    subject,
    text,
    email,
    history,
    weekDelta,
    dryRun,
  };
}

/**
 * @param {{ subject: string, text: string, html: string }} payload
 */
async function sendOpsDigestEmail(payload) {
  const adminEmail = String(
    process.env.KASIF_OPS_DIGEST_EMAIL || process.env.ADMIN_EMAIL || ''
  ).trim();
  const resendKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!adminEmail) return { sent: false, reason: 'missing_admin_email' };
  if (!resendKey) return { sent: false, reason: 'missing_resend_key' };

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    const from =
      String(
        process.env.RESEND_FROM_EMAIL ||
          process.env.EMAIL_FROM ||
          process.env.ADMIN_NOTIF_EMAIL_FROM ||
          ''
      ).trim() || 'AI Keşif <onboarding@resend.dev>';

    await resend.emails.send({
      from,
      to: adminEmail,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    return { sent: true };
  } catch (error) {
    logger.warn('[kasif-ops-digest] email failed:', error?.message || error);
    return { sent: false, reason: error?.message || 'send_failed' };
  }
}
