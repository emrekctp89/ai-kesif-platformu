/**
 * Kâşif etkileşim kayıtlarından admin kalite özeti üretir.
 * DB erişimi yok; saf hesaplama (test edilebilir).
 */

import { buildJobFunnelStats } from './funnel';

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function tokenizeQuestion(question) {
  return String(question || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 4);
}

export function isKasifSoftLandingInteraction(row) {
  return (
    row?.softLanding === true ||
    row?.metaKind === 'soft-landing' ||
    row?.intent?.meta === 'soft-landing'
  );
}

/** Kimlik / yetenek / how meta (soft-landing hariç). */
export function isKasifMetaInteraction(row) {
  if (isKasifSoftLandingInteraction(row)) return false;
  return Boolean(row?.intent?.meta || row?.meta);
}

export function isKasifGuidedInteraction(row) {
  return isKasifMetaInteraction(row) || isKasifSoftLandingInteraction(row);
}

export function isKasifUngroundedInteraction(row) {
  if (isKasifGuidedInteraction(row)) return false;
  return !Array.isArray(row?.source_ids) || row.source_ids.length === 0;
}

export function isKasifIssueInteraction(row) {
  if (row?.feedback === -1) return true;
  if (isKasifUngroundedInteraction(row)) return true;
  if (isKasifGuidedInteraction(row)) return false;
  const c = asNumber(row?.confidence);
  return c > 0 && c < 0.55;
}

/**
 * @param {Array<{
 *   id?: string,
 *   question?: string,
 *   answer?: string,
 *   intent?: object,
 *   confidence?: number,
 *   feedback?: number|null,
 *   created_at?: string,
 *   source_ids?: string[],
 * }>} interactions
 * @param {{ windowDays?: number, sampleLimit?: number }} [options]
 */
export function buildKasifQualityStats(interactions = [], options = {}) {
  const windowDays = Math.max(1, Number(options.windowDays) || 30);
  const sampleLimit = Math.max(5, Number(options.sampleLimit) || 12);
  const rows = Array.isArray(interactions) ? interactions : [];

  const withFeedback = rows.filter((row) => row.feedback === 1 || row.feedback === -1);
  const positive = withFeedback.filter((row) => row.feedback === 1);
  const negative = withFeedback.filter((row) => row.feedback === -1);
  const meta = rows.filter((row) => isKasifMetaInteraction(row));
  const softLanding = rows.filter((row) => isKasifSoftLandingInteraction(row));
  const ungrounded = rows.filter((row) => isKasifUngroundedInteraction(row));
  const lowConfidence = rows.filter((row) => {
    if (isKasifGuidedInteraction(row)) return false;
    const c = asNumber(row.confidence);
    return c > 0 && c < 0.55;
  });
  const issueCount = rows.filter((row) => isKasifIssueInteraction(row)).length;

  const confidences = rows.map((row) => asNumber(row.confidence)).filter((c) => c > 0);
  const avgConfidence =
    confidences.length > 0
      ? Number((confidences.reduce((sum, c) => sum + c, 0) / confidences.length).toFixed(3))
      : null;

  const goalBuckets = new Map();
  for (const row of rows) {
    const goals = Array.isArray(row.intent?.goals) ? row.intent.goals : [];
    const key = goals.length ? goals.join(', ') : '(hedef yok)';
    const bucket = goalBuckets.get(key) || { goals: key, total: 0, negative: 0, positive: 0 };
    bucket.total += 1;
    if (row.feedback === -1) bucket.negative += 1;
    if (row.feedback === 1) bucket.positive += 1;
    goalBuckets.set(key, bucket);
  }

  const topGoals = [...goalBuckets.values()]
    .sort((a, b) => b.total - a.total || b.negative - a.negative)
    .slice(0, 10);

  const negativeTokenCounts = new Map();
  for (const row of negative) {
    for (const token of tokenizeQuestion(row.question)) {
      negativeTokenCounts.set(token, (negativeTokenCounts.get(token) || 0) + 1);
    }
  }
  const topNegativeTokens = [...negativeTokenCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([token, count]) => ({ token, count }));

  const recentNegative = negative
    .slice()
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, sampleLimit)
    .map((row) => ({
      id: row.id,
      question: row.question,
      confidence: asNumber(row.confidence),
      goals: Array.isArray(row.intent?.goals) ? row.intent.goals : [],
      created_at: row.created_at || null,
    }));

  const recentLowConfidence = lowConfidence
    .slice()
    .sort((a, b) => asNumber(a.confidence) - asNumber(b.confidence))
    .slice(0, sampleLimit)
    .map((row) => ({
      id: row.id,
      question: row.question,
      confidence: asNumber(row.confidence),
      goals: Array.isArray(row.intent?.goals) ? row.intent.goals : [],
      created_at: row.created_at || null,
      feedback: row.feedback ?? null,
    }));

  const recentSoftLanding = softLanding
    .slice()
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, sampleLimit)
    .map((row) => ({
      id: row.id,
      question: row.question,
      confidence: asNumber(row.confidence),
      pricePreference: row.intent?.pricePreference || 'any',
      created_at: row.created_at || null,
    }));

  const softLandingPriceBuckets = { free: 0, paid: 0, any: 0 };
  for (const row of softLanding) {
    const pref = row.intent?.pricePreference;
    if (pref === 'free') softLandingPriceBuckets.free += 1;
    else if (pref === 'paid') softLandingPriceBuckets.paid += 1;
    else softLandingPriceBuckets.any += 1;
  }

  const softLandingTokenCounts = new Map();
  for (const row of softLanding) {
    for (const token of tokenizeQuestion(row.question)) {
      softLandingTokenCounts.set(token, (softLandingTokenCounts.get(token) || 0) + 1);
    }
  }
  const topSoftLandingTokens = [...softLandingTokenCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([token, count]) => ({ token, count }));

  // Soft-landing → follow-up → successful recommendation conversion.
  const softLandingFollowUps = rows.filter((row) => row?.intent?.fromSoftLanding === true);
  const softLandingConverted = softLandingFollowUps.filter(
    (row) => Array.isArray(row.source_ids) && row.source_ids.length > 0
  );
  const softLandingStarterBuckets = new Map();
  for (const row of softLandingFollowUps) {
    const key = String(row.intent?.softLandingStarter || '(free-text)').slice(0, 40);
    const bucket = softLandingStarterBuckets.get(key) || {
      starter: key,
      total: 0,
      converted: 0,
    };
    bucket.total += 1;
    if (Array.isArray(row.source_ids) && row.source_ids.length > 0) bucket.converted += 1;
    softLandingStarterBuckets.set(key, bucket);
  }
  function pct(num, den) {
    if (!den) return null;
    return Number(((num / den) * 100).toFixed(1));
  }
  const softLandingConversion = {
    shown: softLanding.length,
    followUps: softLandingFollowUps.length,
    converted: softLandingConverted.length,
    followUpRate: pct(softLandingFollowUps.length, softLanding.length),
    convertOfShown: pct(softLandingConverted.length, softLanding.length),
    convertOfFollowUp: pct(softLandingConverted.length, softLandingFollowUps.length),
    starters: [...softLandingStarterBuckets.values()]
      .map((bucket) => ({
        ...bucket,
        convertRate: pct(bucket.converted, bucket.total),
      }))
      .sort((a, b) => b.total - a.total || b.converted - a.converted)
      .slice(0, 10),
  };

  const helpfulRate =
    withFeedback.length > 0
      ? Number(((positive.length / withFeedback.length) * 100).toFixed(1))
      : null;

  const jobFunnel = buildJobFunnelStats(rows);

  return {
    windowDays,
    total: rows.length,
    withFeedback: withFeedback.length,
    positive: positive.length,
    negative: negative.length,
    helpfulRate,
    meta: meta.length,
    softLanding: softLanding.length,
    softLandingPriceBuckets,
    topSoftLandingTokens,
    softLandingConversion,
    ungrounded: ungrounded.length,
    lowConfidence: lowConfidence.length,
    issueCount,
    avgConfidence,
    topGoals,
    topNegativeTokens,
    recentNegative,
    recentLowConfidence,
    recentSoftLanding,
    jobFunnel,
    ruleCandidates: topNegativeTokens.slice(0, 8).map(({ token, count }) => ({
      token,
      count,
      suggestion: `Lexicon'a "${token}" için concept/goal evidence veya negativeEvidence eklemeyi değerlendir.`,
    })),
  };
}
