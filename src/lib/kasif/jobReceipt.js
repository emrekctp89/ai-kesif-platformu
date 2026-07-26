/**
 * Shareable job receipt for first_result / job_done milestones.
 * Pure helpers — no DB access.
 */

import { highestFunnelStage, normalizeFunnel } from './funnel';
import { formatKasifGoalLabel } from './goalLabels';

/**
 * @param {string|null|undefined} interactionId
 * @param {string|null|undefined} feedbackToken
 * @param {string} [locale]
 * @returns {string|null}
 */
export function buildJobReceiptSharePath(interactionId, feedbackToken, locale = 'tr') {
  const id = String(interactionId || '').trim();
  const token = String(feedbackToken || '').trim();
  if (!id || !token) return null;
  const prefix = locale === 'en' ? '/en' : '';
  const params = new URLSearchParams({ id, t: token });
  return `${prefix}/kasif/receipt?${params.toString()}`;
}

/**
 * Absolute share URL when site origin is known.
 * @param {string|null} path
 * @param {string} [origin]
 */
export function buildJobReceiptShareUrl(path, origin = '') {
  if (!path) return null;
  const base = String(origin || '')
    .trim()
    .replace(/\/$/, '');
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Build a public-safe receipt object from interaction fields.
 * @param {{
 *   id?: string|null,
 *   feedback_token?: string|null,
 *   feedbackToken?: string|null,
 *   question?: string|null,
 *   funnel?: object|null,
 *   intent?: object|null,
 *   created_at?: string|null,
 * }} interaction
 * @param {{ locale?: string, origin?: string }} [options]
 */
export function buildJobReceipt(interaction = {}, options = {}) {
  const locale = options.locale === 'en' ? 'en' : 'tr';
  const funnel = normalizeFunnel(interaction?.funnel);
  const stage = highestFunnelStage(funnel);
  const hasMilestone = Boolean(funnel.stages?.first_result || funnel.stages?.job_done);
  const interactionId = interaction?.id || null;
  const feedbackToken = interaction?.feedbackToken || interaction?.feedback_token || null;
  const sharePath = buildJobReceiptSharePath(interactionId, feedbackToken, locale);
  const shareUrl = buildJobReceiptShareUrl(sharePath, options.origin);

  const goalsRaw = Array.isArray(interaction?.intent?.goals)
    ? interaction.intent.goals
    : Array.isArray(funnel.result_artifact?.goals)
      ? funnel.result_artifact.goals
      : [];
  const goals = goalsRaw
    .map((g) => formatKasifGoalLabel(g, locale) || String(g || '').trim())
    .filter(Boolean)
    .slice(0, 6);

  const tool =
    funnel.selected_tool && (funnel.selected_tool.title || funnel.selected_tool.slug)
      ? {
          id: funnel.selected_tool.id || null,
          slug: funnel.selected_tool.slug || null,
          title: funnel.selected_tool.title || funnel.selected_tool.slug || null,
        }
      : null;

  const artifact = funnel.result_artifact
    ? {
        bridge: funnel.result_artifact.bridge || null,
        packId: funnel.result_artifact.packId || null,
        runnerSource: funnel.result_artifact.runner_source || funnel.result_artifact.source || null,
        preview: funnel.result_artifact.preview || null,
        goal: funnel.result_artifact.goal || null,
      }
    : null;

  const completedAt =
    funnel.stages?.job_done || funnel.stages?.first_result || interaction?.created_at || null;

  const receipt = {
    interactionId,
    hasMilestone,
    stage: stage || null,
    milestone: funnel.stages?.job_done
      ? 'job_done'
      : funnel.stages?.first_result
        ? 'first_result'
        : null,
    tool,
    goals,
    minutesToFirstResult: funnel.minutes_to_first_result,
    packId: artifact?.packId || interaction?.intent?.packId || null,
    artifact,
    question: String(interaction?.question || '')
      .trim()
      .slice(0, 200),
    completedAt,
    sharePath,
    shareUrl,
  };

  receipt.shareText = formatJobReceiptShareText(receipt, locale);
  return receipt;
}

/**
 * Human-readable multi-line summary for clipboard / share.
 * @param {ReturnType<typeof buildJobReceipt>} receipt
 * @param {string} [locale]
 */
export function formatJobReceiptShareText(receipt, locale = 'tr') {
  const lang = locale === 'en' ? 'en' : 'tr';
  const lines = [];

  if (lang === 'en') {
    lines.push('AI Keşif · Job receipt');
    if (receipt.milestone === 'job_done') lines.push('Status: job done');
    else if (receipt.milestone === 'first_result') lines.push('Status: first result');
    else lines.push('Status: in progress');
    if (receipt.tool?.title) lines.push(`Tool: ${receipt.tool.title}`);
    if (receipt.goals?.length) lines.push(`Goals: ${receipt.goals.join(', ')}`);
    if (receipt.minutesToFirstResult != null) {
      lines.push(`Time to first result: ~${receipt.minutesToFirstResult} min`);
    }
    if (receipt.packId) lines.push(`Pack: ${receipt.packId}`);
    if (receipt.artifact?.runnerSource) lines.push(`Runner: ${receipt.artifact.runnerSource}`);
    if (receipt.artifact?.preview) {
      lines.push('', 'Preview:', receipt.artifact.preview.slice(0, 160));
    }
    if (receipt.shareUrl || receipt.sharePath) {
      lines.push('', `Link: ${receipt.shareUrl || receipt.sharePath}`);
    }
  } else {
    lines.push('AI Keşif · Görev makbuzu');
    if (receipt.milestone === 'job_done') lines.push('Durum: iş bitti');
    else if (receipt.milestone === 'first_result') lines.push('Durum: ilk sonuç');
    else lines.push('Durum: devam ediyor');
    if (receipt.tool?.title) lines.push(`Araç: ${receipt.tool.title}`);
    if (receipt.goals?.length) lines.push(`Hedefler: ${receipt.goals.join(', ')}`);
    if (receipt.minutesToFirstResult != null) {
      lines.push(`İlk sonuca: ~${receipt.minutesToFirstResult} dk`);
    }
    if (receipt.packId) lines.push(`Paket: ${receipt.packId}`);
    if (receipt.artifact?.runnerSource) lines.push(`Runner: ${receipt.artifact.runnerSource}`);
    if (receipt.artifact?.preview) {
      lines.push('', 'Önizleme:', receipt.artifact.preview.slice(0, 160));
    }
    if (receipt.shareUrl || receipt.sharePath) {
      lines.push('', `Bağlantı: ${receipt.shareUrl || receipt.sharePath}`);
    }
  }

  return lines.filter((line) => line !== undefined).join('\n');
}

/**
 * Client-side receipt from panel state (before re-fetch).
 */
export function buildClientJobReceipt({
  interactionId,
  feedbackToken,
  source,
  goals = [],
  minutes = null,
  jobDone = null,
  firstResult = null,
  packId = null,
  locale = 'tr',
  origin = '',
}) {
  const hasFr = firstResult === true || jobDone === true || jobDone === 'partial';
  const hasDone = jobDone === true;
  if (!hasFr && !hasDone) {
    return buildJobReceipt(
      { id: interactionId, feedbackToken, funnel: {}, intent: { goals } },
      { locale, origin }
    );
  }

  const now = new Date().toISOString();
  const funnel = {
    stages: {
      job_stated: now,
      tool_recommended: now,
      tool_selected: now,
      ...(hasFr ? { first_result: now } : {}),
      ...(hasDone ? { job_done: now } : {}),
    },
    minutes_to_first_result: minutes,
    selected_tool: source ? { id: source.id, slug: source.slug, title: source.title } : null,
    result_artifact: packId ? { packId, bridge: 'self_report' } : null,
    events: [],
  };

  return buildJobReceipt(
    {
      id: interactionId,
      feedbackToken,
      funnel,
      intent: { goals, packId },
    },
    { locale, origin }
  );
}
