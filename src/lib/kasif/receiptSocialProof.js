/**
 * Anonymous receipt / milestone social-proof aggregates.
 * Pure helpers — no PII, no interaction ids, no questions.
 */

import { normalizeFunnel } from './funnel';

/** Hide sparse counters so the landing strip never looks empty/spammy. */
export const RECEIPT_SOCIAL_PROOF_MIN_VISIBLE = 3;

/**
 * @param {Array<{ funnel?: object|null, intent?: object|null, created_at?: string|null }>} interactions
 * @param {{
 *   windowDays?: number,
 *   minVisible?: number,
 *   topLimit?: number,
 *   generatedAt?: string|Date,
 * }} [options]
 */
export function buildReceiptSocialProofStats(interactions = [], options = {}) {
  const windowDays = Math.max(1, Number(options.windowDays) || 30);
  const minVisible = Math.max(1, Number(options.minVisible) || RECEIPT_SOCIAL_PROOF_MIN_VISIBLE);
  const topLimit = Math.max(1, Math.min(10, Number(options.topLimit) || 5));
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();

  const rows = Array.isArray(interactions) ? interactions : [];
  let firstResults = 0;
  let jobDones = 0;
  let withMilestone = 0;
  let runnerCount = 0;
  let bridgePasteCount = 0;
  const minutesSamples = [];
  const packBuckets = new Map();

  for (const row of rows) {
    const funnel = normalizeFunnel(row?.funnel);
    const hasFr = Boolean(funnel.stages?.first_result);
    const hasDone = Boolean(funnel.stages?.job_done);
    if (!hasFr && !hasDone) continue;

    withMilestone += 1;
    if (hasFr) firstResults += 1;
    if (hasDone) jobDones += 1;

    if (
      funnel.minutes_to_first_result != null &&
      Number.isFinite(Number(funnel.minutes_to_first_result))
    ) {
      minutesSamples.push(Number(funnel.minutes_to_first_result));
    }

    const bridge = funnel.result_artifact?.bridge;
    if (bridge === 'runner') runnerCount += 1;
    if (bridge === 'paste') bridgePasteCount += 1;

    const packId =
      row?.intent?.packId ||
      funnel.result_artifact?.packId ||
      funnel.events?.find((e) => e?.meta?.packId)?.meta?.packId ||
      null;
    if (packId) {
      const key = String(packId).slice(0, 64);
      packBuckets.set(key, (packBuckets.get(key) || 0) + 1);
    }
  }

  const avgMinutesToFirstResult =
    minutesSamples.length > 0
      ? Number(
          (minutesSamples.reduce((sum, value) => sum + value, 0) / minutesSamples.length).toFixed(1)
        )
      : null;

  // Round for public display (avoid fingerprinting tiny samples).
  const avgMinutesRounded =
    avgMinutesToFirstResult == null ? null : Math.max(1, Math.round(avgMinutesToFirstResult));

  const topPacks = [...packBuckets.entries()]
    .map(([packId, count]) => ({ packId, count }))
    .sort((a, b) => b.count - a.count || a.packId.localeCompare(b.packId))
    .slice(0, topLimit);

  const doneOfFirstResult =
    firstResults > 0 ? Number(((jobDones / firstResults) * 100).toFixed(1)) : null;

  return {
    kind: 'kasif_receipt_social_proof',
    version: 1,
    windowDays,
    generatedAt: generatedAt.toISOString(),
    withMilestone,
    firstResults,
    jobDones,
    runnerCount,
    bridgePasteCount,
    avgMinutesToFirstResult: avgMinutesRounded,
    doneOfFirstResult,
    topPacks,
    minVisible,
    visible: withMilestone >= minVisible,
  };
}

/**
 * Public API-safe payload (strip internal fields if any).
 * @param {ReturnType<typeof buildReceiptSocialProofStats>} stats
 */
export function toPublicReceiptSocialProof(stats) {
  const s = stats || buildReceiptSocialProofStats([]);
  return {
    windowDays: s.windowDays,
    generatedAt: s.generatedAt,
    withMilestone: s.withMilestone,
    firstResults: s.firstResults,
    jobDones: s.jobDones,
    runnerCount: s.runnerCount,
    bridgePasteCount: s.bridgePasteCount,
    avgMinutesToFirstResult: s.avgMinutesToFirstResult,
    doneOfFirstResult: s.doneOfFirstResult,
    topPacks: Array.isArray(s.topPacks) ? s.topPacks : [],
    minVisible: s.minVisible,
    visible: Boolean(s.visible),
  };
}
