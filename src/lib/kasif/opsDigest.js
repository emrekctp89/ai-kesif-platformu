/**
 * Weekly Kâşif ops digest — pure snapshot + email formatters.
 * No DB / Resend; safe for unit tests and client imports.
 */

/**
 * @typedef {object} OpsDigestPinInfo
 * @property {'A'|'B'|null} [variant]
 * @property {string|null} [pinnedAt]
 * @property {string|null} [note]
 * @property {string} [source]
 * @property {string|null} [envForce]
 * @property {string|null} [envDefault]
 */

/**
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
function isoDay(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/**
 * @param {number|null|undefined} n
 * @param {number} [digits]
 * @returns {string}
 */
function fmtNum(n, digits = 0) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const num = Number(n);
  if (digits === 0) return String(Math.round(num));
  return num.toFixed(digits);
}

/**
 * @param {number|null|undefined} rate
 * @returns {string}
 */
function fmtPct(rate) {
  if (rate == null || !Number.isFinite(Number(rate))) return '—';
  return `%${Number(rate).toFixed(1)}`;
}

/**
 * @param {number|null|undefined} ratio
 * @returns {string}
 */
function fmtRatio(ratio) {
  if (ratio == null || !Number.isFinite(Number(ratio))) return '—';
  return Number(ratio).toFixed(2);
}

/**
 * Build a compact ops snapshot from quality stats + pin metadata.
 *
 * @param {object} stats - from buildKasifQualityStats
 * @param {OpsDigestPinInfo} [pinInfo]
 * @param {{
 *   windowDays?: number,
 *   generatedAt?: string|Date,
 *   periodStart?: string|Date,
 *   periodEnd?: string|Date,
 *   locale?: 'tr'|'en',
 * }} [options]
 */
export function buildOpsDigestSnapshot(stats = {}, pinInfo = {}, options = {}) {
  const windowDays = Math.max(1, Number(options.windowDays) || Number(stats.windowDays) || 7);
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();
  const periodEnd = options.periodEnd ? new Date(options.periodEnd) : generatedAt;
  const periodStart = options.periodStart
    ? new Date(options.periodStart)
    : new Date(periodEnd.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const funnel = stats.jobFunnel || {};
  const counts = funnel.counts || {};
  const conversion = funnel.conversion || {};
  const packRoi = funnel.packRoi || {};
  const soft = stats.softLandingConversion || {};
  const winner = soft.winner || {};
  const addTool = stats.addTool || {};
  const statusCounts = addTool.statusCounts || {};
  const runnerSourceMix = Array.isArray(funnel.runnerSourceMix) ? funnel.runnerSourceMix : [];

  const pinVariant = pinInfo.variant === 'A' || pinInfo.variant === 'B' ? pinInfo.variant : null;
  const envForce =
    pinInfo.envForce === 'A' || pinInfo.envForce === 'B'
      ? pinInfo.envForce
      : pinInfo.envForce || null;
  const envDefault = pinInfo.envDefault != null ? String(pinInfo.envDefault) : null;

  /** Effective assignment priority label for ops. */
  let effectivePin = 'ab_split';
  if (envForce === 'A' || envForce === 'B') effectivePin = `env_force:${envForce}`;
  else if (pinVariant) effectivePin = `ops_pin:${pinVariant}`;
  else if (envDefault === 'A' || envDefault === 'B') effectivePin = `env_default:${envDefault}`;
  else if (envDefault && String(envDefault).toLowerCase() === 'ab') effectivePin = 'ab_split';

  return {
    kind: 'kasif_ops_digest',
    version: 1,
    locale: options.locale === 'en' ? 'en' : 'tr',
    windowDays,
    generatedAt: generatedAt.toISOString(),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    periodLabel: `${isoDay(periodStart)} → ${isoDay(periodEnd)}`,
    quality: {
      total: Number(stats.total) || 0,
      withFeedback: Number(stats.withFeedback) || 0,
      positive: Number(stats.positive) || 0,
      negative: Number(stats.negative) || 0,
      helpfulRate: stats.helpfulRate ?? null,
      avgConfidence: stats.avgConfidence ?? null,
      issueCount: Number(stats.issueCount) || 0,
      ungrounded: Number(stats.ungrounded) || 0,
      softLanding: Number(stats.softLanding) || 0,
    },
    funnel: {
      withFunnel: Number(funnel.withFunnel) || 0,
      counts: {
        job_stated: Number(counts.job_stated) || 0,
        tool_recommended: Number(counts.tool_recommended) || 0,
        tool_selected: Number(counts.tool_selected) || 0,
        setup_started: Number(counts.setup_started) || 0,
        first_result: Number(counts.first_result) || 0,
        job_done: Number(counts.job_done) || 0,
      },
      conversion: {
        firstResultOfStated: conversion.firstResultOfStated ?? null,
        doneOfStated: conversion.doneOfStated ?? null,
        doneOfFirstResult: conversion.doneOfFirstResult ?? null,
        runnerOfFirstResult: conversion.runnerOfFirstResult ?? null,
        bridgeOfFirstResult: conversion.bridgeOfFirstResult ?? null,
      },
      avgMinutesToFirstResult: funnel.avgMinutesToFirstResult ?? null,
      bridgePasteCount: Number(funnel.bridgePasteCount) || 0,
      runnerCount: Number(funnel.runnerCount) || 0,
      runnerSourceMix: runnerSourceMix.map((row) => ({
        source: String(row.source || 'other'),
        count: Number(row.count) || 0,
        rate: row.rate ?? null,
      })),
    },
    packRoi: {
      packs: Number(packRoi.packs) || 0,
      runs: Number(packRoi.runs) || 0,
      firstResults: Number(packRoi.firstResults) || 0,
      jobDones: Number(packRoi.jobDones) || 0,
      frPerRun: packRoi.frPerRun ?? null,
      donePerRun: packRoi.donePerRun ?? null,
      doneOfFirstResult: packRoi.doneOfFirstResult ?? null,
      topByRoi: (Array.isArray(packRoi.topByRoi) ? packRoi.topByRoi : []).slice(0, 5).map((p) => ({
        packId: String(p.packId || ''),
        roiScore: p.roiScore ?? null,
        donePerRun: p.donePerRun ?? null,
        frPerRun: p.frPerRun ?? null,
        runner: Number(p.runner) || 0,
        jobDone: Number(p.jobDone) || 0,
        firstResult: Number(p.firstResult) || 0,
      })),
    },
    softLanding: {
      shown: Number(soft.shown) || 0,
      followUps: Number(soft.followUps) || 0,
      converted: Number(soft.converted) || 0,
      followUpRate: soft.followUpRate ?? null,
      convertOfFollowUp: soft.convertOfFollowUp ?? null,
      convertOfShown: soft.convertOfShown ?? null,
      winner: winner.winner ?? null,
      winnerReason: winner.reason ?? null,
      deltaConvertOfFollowUp: winner.deltaConvertOfFollowUp ?? null,
      variants: (Array.isArray(soft.variants) ? soft.variants : []).map((v) => ({
        variant: v.variant,
        shown: Number(v.shown) || 0,
        followUps: Number(v.followUps) || 0,
        converted: Number(v.converted) || 0,
        convertOfFollowUp: v.convertOfFollowUp ?? null,
      })),
      pin: {
        variant: pinVariant,
        pinnedAt: pinInfo.pinnedAt || null,
        note: pinInfo.note || null,
        source: pinInfo.source || 'app_settings',
        envForce: envForce || null,
        envDefault: envDefault || null,
        effective: effectivePin,
      },
    },
    addTool: {
      total: Number(addTool.total) || 0,
      queued: Number(statusCounts.queued) || 0,
      duplicate: Number(statusCounts.duplicate) || 0,
      missing_url: Number(statusCounts.missing_url) || 0,
      error: Number(statusCounts.error) || 0,
      other: Number(statusCounts.other) || 0,
      queueRate: addTool.queueRate ?? null,
    },
  };
}

/**
 * Format a single WoW metric as "+2 (+20%)" / "−5 (−20%)" / "0".
 * @param {{ delta?: number, pct?: number|null }|null|undefined} metric
 * @returns {string}
 */
export function formatOpsDigestWowMetric(metric) {
  if (!metric || typeof metric !== 'object') return '—';
  const delta = Number(metric.delta);
  if (!Number.isFinite(delta)) return '—';
  const sign = delta > 0 ? '+' : '';
  const pct =
    metric.pct == null || !Number.isFinite(Number(metric.pct))
      ? ''
      : ` (${sign}${Number(metric.pct)}%)`;
  return `${sign}${delta}${pct}`;
}

/**
 * Multi-line WoW block for email / text digest.
 * @param {ReturnType<typeof buildOpsDigestWeekDelta>} weekDelta
 * @returns {string[]}
 */
export function formatOpsDigestWowLines(weekDelta) {
  if (!weekDelta?.available) return [];
  const lines = [
    '— Haftadan haftaya (WoW) —',
    `Karşılaştırma: ${weekDelta.currentPeriod || '—'} vs ${weekDelta.previousPeriod || '—'}`,
    `FR: ${formatOpsDigestWowMetric(weekDelta.firstResult)} · done: ${formatOpsDigestWowMetric(weekDelta.jobDone)} · runner: ${formatOpsDigestWowMetric(weekDelta.runnerRuns)}`,
  ];
  if (
    weekDelta.helpfulRate?.delta != null &&
    Number.isFinite(Number(weekDelta.helpfulRate.delta))
  ) {
    const d = Number(weekDelta.helpfulRate.delta);
    const sign = d > 0 ? '+' : '';
    lines.push(`Helpful: ${sign}${d} pp`);
  }
  if (weekDelta.qualityTotal) {
    lines.push(`Etkileşim: ${formatOpsDigestWowMetric(weekDelta.qualityTotal)}`);
  }
  return lines;
}

/**
 * @param {ReturnType<typeof buildOpsDigestSnapshot>} snapshot
 * @param {{ weekDelta?: ReturnType<typeof buildOpsDigestWeekDelta>|null }} [options]
 * @returns {string}
 */
export function formatOpsDigestSubject(snapshot, options = {}) {
  const period = snapshot?.periodLabel || 'haftalık';
  const fr = snapshot?.funnel?.counts?.first_result ?? 0;
  const done = snapshot?.funnel?.counts?.job_done ?? 0;
  let subject = `[Kâşif] Ops özeti · ${period} · FR ${fr} / done ${done}`;
  const weekDelta = options.weekDelta;
  if (weekDelta?.available) {
    const frDelta = weekDelta.firstResult?.delta;
    const doneDelta = weekDelta.jobDone?.delta;
    if (Number.isFinite(Number(frDelta)) || Number.isFinite(Number(doneDelta))) {
      const frPart = Number.isFinite(Number(frDelta))
        ? `FR ${Number(frDelta) > 0 ? '+' : ''}${Number(frDelta)}`
        : null;
      const donePart = Number.isFinite(Number(doneDelta))
        ? `done ${Number(doneDelta) > 0 ? '+' : ''}${Number(doneDelta)}`
        : null;
      const wow = [frPart, donePart].filter(Boolean).join(' · ');
      if (wow) subject += ` · WoW ${wow}`;
    }
  }
  return subject;
}

/**
 * @param {ReturnType<typeof buildOpsDigestSnapshot>} snapshot
 * @param {{ adminPath?: string, siteUrl?: string, weekDelta?: object|null }} [options]
 * @returns {string}
 */
export function formatOpsDigestText(snapshot, options = {}) {
  const site = String(
    options.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://aikesif.com'
  ).replace(/\/$/, '');
  const adminPath = options.adminPath || '/admin?tab=kasif_quality';
  const adminUrl = adminPath.startsWith('http') ? adminPath : `${site}${adminPath}`;
  const q = snapshot.quality || {};
  const f = snapshot.funnel || {};
  const c = f.counts || {};
  const conv = f.conversion || {};
  const roi = snapshot.packRoi || {};
  const sl = snapshot.softLanding || {};
  const pin = sl.pin || {};
  const at = snapshot.addTool || {};
  const weekDelta = options.weekDelta || null;

  const lines = [
    'Kâşif haftalık ops özeti',
    `Dönem: ${snapshot.periodLabel || '—'} (${snapshot.windowDays || 7} gün)`,
    `Üretilme: ${snapshot.generatedAt || '—'}`,
    '',
    '— Kalite —',
    `Etkileşim: ${fmtNum(q.total)} · feedback: ${fmtNum(q.withFeedback)} · helpful: ${fmtPct(q.helpfulRate)}`,
    `Ort. güven: ${q.avgConfidence != null ? fmtRatio(q.avgConfidence) : '—'} · issue: ${fmtNum(q.issueCount)} · ungrounded: ${fmtNum(q.ungrounded)}`,
    '',
    '— Funnel —',
    `withFunnel: ${fmtNum(f.withFunnel)}`,
    `stated ${fmtNum(c.job_stated)} → recommended ${fmtNum(c.tool_recommended)} → selected ${fmtNum(c.tool_selected)} → setup ${fmtNum(c.setup_started)} → first_result ${fmtNum(c.first_result)} → done ${fmtNum(c.job_done)}`,
    `FR/stated: ${fmtPct(conv.firstResultOfStated)} · done/stated: ${fmtPct(conv.doneOfStated)} · done/FR: ${fmtPct(conv.doneOfFirstResult)}`,
    `Runner: ${fmtNum(f.runnerCount)} (${fmtPct(conv.runnerOfFirstResult)} of FR) · bridge paste: ${fmtNum(f.bridgePasteCount)} (${fmtPct(conv.bridgeOfFirstResult)} of FR)`,
    f.avgMinutesToFirstResult != null
      ? `Ort. dakika → first_result: ${fmtNum(f.avgMinutesToFirstResult, 1)}`
      : null,
  ];

  const wowLines = formatOpsDigestWowLines(weekDelta);
  if (wowLines.length) {
    lines.push('', ...wowLines);
  }

  if ((f.runnerSourceMix || []).length) {
    lines.push(
      `Runner source mix: ${(f.runnerSourceMix || [])
        .map((r) => `${r.source}=${r.count}${r.rate != null ? ` (${fmtPct(r.rate)})` : ''}`)
        .join(', ')}`
    );
  }

  lines.push(
    '',
    '— Pack ROI —',
    `Packs: ${fmtNum(roi.packs)} · runs: ${fmtNum(roi.runs)} · FR: ${fmtNum(roi.firstResults)} · done: ${fmtNum(roi.jobDones)}`,
    `FR/run: ${fmtRatio(roi.frPerRun)} · done/run: ${fmtRatio(roi.donePerRun)} · done/FR: ${fmtPct(roi.doneOfFirstResult)}`
  );

  for (const pack of roi.topByRoi || []) {
    lines.push(
      `  • ${pack.packId}: ROI ${fmtRatio(pack.roiScore)} (done/run) · runs ${fmtNum(pack.runner)} · FR ${fmtNum(pack.firstResult)} · done ${fmtNum(pack.jobDone)}`
    );
  }
  if (!(roi.topByRoi || []).length) {
    lines.push('  (henüz pack runner ROI verisi yok)');
  }

  lines.push(
    '',
    '— Soft-landing —',
    `Shown ${fmtNum(sl.shown)} → follow-up ${fmtNum(sl.followUps)} (${fmtPct(sl.followUpRate)}) → convert ${fmtNum(sl.converted)} (of FU: ${fmtPct(sl.convertOfFollowUp)})`,
    `Kazanan: ${sl.winner != null ? String(sl.winner) : '—'} (${sl.winnerReason || '—'})${
      sl.deltaConvertOfFollowUp != null ? ` · Δ ${fmtNum(sl.deltaConvertOfFollowUp, 1)} pp` : ''
    }`
  );

  for (const v of sl.variants || []) {
    lines.push(
      `  • ${v.variant}: shown ${fmtNum(v.shown)}, FU ${fmtNum(v.followUps)}, conv ${fmtNum(v.converted)} (${fmtPct(v.convertOfFollowUp)})`
    );
  }

  lines.push(
    `Ops pin: ${pin.variant || 'yok'}${pin.pinnedAt ? ` @ ${pin.pinnedAt}` : ''}`,
    `Env force: ${pin.envForce || '—'} · default: ${pin.envDefault || '—'}`,
    `Etkin atama: ${pin.effective || 'ab_split'}`,
    '',
    '— Add-tool —',
    `Toplam ${fmtNum(at.total)} · queued ${fmtNum(at.queued)} · duplicate ${fmtNum(at.duplicate)} · missing_url ${fmtNum(at.missing_url)} · error ${fmtNum(at.error)}`,
    '',
    `Admin: ${adminUrl}`,
    '',
    '— AI Keşif Platformu'
  );

  return lines.filter((line) => line != null).join('\n');
}

/**
 * Escape minimal HTML entities for email body.
 * @param {unknown} value
 * @returns {string}
 */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {ReturnType<typeof buildOpsDigestSnapshot>} snapshot
 * @param {{ adminPath?: string, siteUrl?: string, weekDelta?: object|null }} [options]
 * @returns {string}
 */
export function formatOpsDigestHtml(snapshot, options = {}) {
  const site = String(
    options.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://aikesif.com'
  ).replace(/\/$/, '');
  const adminPath = options.adminPath || '/admin?tab=kasif_quality';
  const adminUrl = adminPath.startsWith('http') ? adminPath : `${site}${adminPath}`;
  const text = formatOpsDigestText(snapshot, { ...options, siteUrl: site, adminPath });
  const pre = esc(text).replace(/\n/g, '<br/>');

  return `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;padding:20px;max-width:640px;margin:0 auto;color:#111">
      <h1 style="font-size:18px;margin:0 0 8px">Kâşif haftalık ops özeti</h1>
      <p style="margin:0 0 16px;color:#555;font-size:13px">${esc(snapshot.periodLabel || '')} · ${esc(String(snapshot.windowDays || 7))} gün</p>
      <div style="font-size:13px;line-height:1.55;color:#222;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px">
        ${pre}
      </div>
      <p style="margin:20px 0 0">
        <a href="${esc(adminUrl)}" style="display:inline-block;padding:10px 16px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px">
          Admin · Kâşif kalite
        </a>
      </p>
      <p style="font-size:11px;color:#888;margin-top:20px">AI Keşif Platformu · otomatik ops digest</p>
    </div>
  `.trim();
}

/**
 * Whether the weekly ops digest email send is enabled via env.
 * @param {NodeJS.ProcessEnv|Record<string,string|undefined>} [env]
 */
export function isOpsDigestNotifyEnabled(env = process.env) {
  return String(env.KASIF_OPS_DIGEST || '').toLowerCase() === 'true';
}

/** app_settings key for last weekly ops digest + short ring history */
export const OPS_DIGEST_HISTORY_KEY = 'kasif_ops_digest_last';
export const OPS_DIGEST_HISTORY_MAX = 8;

/**
 * Compact summary for ring history (keeps app_settings jsonb small).
 * @param {ReturnType<typeof buildOpsDigestSnapshot>} snapshot
 * @param {{
 *   savedAt?: string,
 *   subject?: string|null,
 *   emailSent?: boolean,
 *   emailReason?: string|null,
 *   dryRun?: boolean,
 * }} [meta]
 */
export function buildOpsDigestHistorySummary(snapshot = {}, meta = {}) {
  const quality = snapshot.quality || {};
  const funnel = snapshot.funnel || {};
  const counts = funnel.counts || {};
  const packRoi = snapshot.packRoi || {};
  const soft = snapshot.softLanding || {};
  const pin = soft.pin || {};
  const addTool = snapshot.addTool || {};

  return {
    savedAt: meta.savedAt || snapshot.generatedAt || new Date().toISOString(),
    subject: meta.subject || formatOpsDigestSubject(snapshot),
    emailSent: Boolean(meta.emailSent),
    emailReason: meta.emailReason || null,
    dryRun: Boolean(meta.dryRun),
    windowDays: Number(snapshot.windowDays) || 7,
    periodLabel: snapshot.periodLabel || null,
    generatedAt: snapshot.generatedAt || null,
    quality: {
      total: Number(quality.total) || 0,
      helpfulRate: quality.helpfulRate ?? null,
      issueCount: Number(quality.issueCount) || 0,
    },
    funnel: {
      withFunnel: Number(funnel.withFunnel) || 0,
      first_result: Number(counts.first_result) || 0,
      job_done: Number(counts.job_done) || 0,
      runnerCount: Number(funnel.runnerCount) || 0,
    },
    packRoi: {
      runs: Number(packRoi.runs) || 0,
      frPerRun: packRoi.frPerRun ?? null,
      donePerRun: packRoi.donePerRun ?? null,
      topPackId: packRoi.topByRoi?.[0]?.packId || null,
    },
    softLanding: {
      shown: Number(soft.shown) || 0,
      winner: soft.winner ?? null,
      pinEffective: pin.effective || 'ab_split',
    },
    addTool: {
      total: Number(addTool.total) || 0,
      queued: Number(addTool.queued) || 0,
    },
  };
}

/**
 * Full last-run record (includes snapshot for admin re-read).
 * @param {ReturnType<typeof buildOpsDigestSnapshot>} snapshot
 * @param {{
 *   savedAt?: string,
 *   subject?: string|null,
 *   emailSent?: boolean,
 *   emailReason?: string|null,
 *   dryRun?: boolean,
 * }} [meta]
 */
export function buildOpsDigestHistoryRecord(snapshot, meta = {}) {
  const summary = buildOpsDigestHistorySummary(snapshot, meta);
  return {
    ...summary,
    snapshot: snapshot && typeof snapshot === 'object' ? snapshot : null,
  };
}

/**
 * Append a new run into stored history document.
 * @param {object|null|undefined} existing parsed app_settings value
 * @param {ReturnType<typeof buildOpsDigestHistoryRecord>} record
 * @param {{ max?: number }} [options]
 */
export function appendOpsDigestHistory(existing, record, options = {}) {
  const max = Math.max(1, Math.min(24, Number(options.max) || OPS_DIGEST_HISTORY_MAX));
  const prev = existing && typeof existing === 'object' ? existing : {};
  const prevHistory = Array.isArray(prev.history) ? prev.history : [];
  // Ring stores compact summaries only (drop nested snapshot).
  const compact = buildOpsDigestHistorySummary(record.snapshot || {}, {
    savedAt: record.savedAt,
    subject: record.subject,
    emailSent: record.emailSent,
    emailReason: record.emailReason,
    dryRun: record.dryRun,
  });
  const history = [compact, ...prevHistory].filter((entry) => entry && entry.savedAt).slice(0, max);

  return {
    version: 1,
    key: OPS_DIGEST_HISTORY_KEY,
    last: record,
    history,
    updatedAt: record.savedAt || new Date().toISOString(),
  };
}

/**
 * Week-over-week (or run-over-run) delta between two history summaries.
 * Prefer history[0] (latest) vs history[1] (previous).
 *
 * @param {object|null|undefined} current
 * @param {object|null|undefined} previous
 * @returns {{
 *   available: boolean,
 *   currentPeriod: string|null,
 *   previousPeriod: string|null,
 *   firstResult: { current: number, previous: number, delta: number, pct: number|null },
 *   jobDone: { current: number, previous: number, delta: number, pct: number|null },
 *   runnerRuns: { current: number, previous: number, delta: number, pct: number|null },
 *   qualityTotal: { current: number, previous: number, delta: number, pct: number|null },
 *   helpfulRate: { current: number|null, previous: number|null, delta: number|null },
 * }|null}
 */
export function buildOpsDigestWeekDelta(current, previous) {
  if (!current || typeof current !== 'object' || !previous || typeof previous !== 'object') {
    return null;
  }

  function metric(curVal, prevVal) {
    const currentN = Number(curVal) || 0;
    const previousN = Number(prevVal) || 0;
    const delta = currentN - previousN;
    const pct =
      previousN === 0
        ? currentN === 0
          ? 0
          : null
        : Number(((delta / previousN) * 100).toFixed(1));
    return { current: currentN, previous: previousN, delta, pct };
  }

  function rateMetric(curVal, prevVal) {
    const hasCur = curVal != null && Number.isFinite(Number(curVal));
    const hasPrev = prevVal != null && Number.isFinite(Number(prevVal));
    if (!hasCur && !hasPrev) {
      return { current: null, previous: null, delta: null };
    }
    const currentN = hasCur ? Number(curVal) : null;
    const previousN = hasPrev ? Number(prevVal) : null;
    const delta =
      currentN != null && previousN != null ? Number((currentN - previousN).toFixed(1)) : null;
    return { current: currentN, previous: previousN, delta };
  }

  return {
    available: true,
    currentPeriod: current.periodLabel || current.savedAt || null,
    previousPeriod: previous.periodLabel || previous.savedAt || null,
    firstResult: metric(current.funnel?.first_result, previous.funnel?.first_result),
    jobDone: metric(current.funnel?.job_done, previous.funnel?.job_done),
    runnerRuns: metric(current.packRoi?.runs, previous.packRoi?.runs),
    qualityTotal: metric(current.quality?.total, previous.quality?.total),
    helpfulRate: rateMetric(current.quality?.helpfulRate, previous.quality?.helpfulRate),
  };
}

/**
 * Resolve current/previous entries from a history document for WoW delta.
 * @param {{ last?: object|null, history?: object[] }} doc
 */
export function pickOpsDigestDeltaPair(doc = {}) {
  const history = Array.isArray(doc.history) ? doc.history : [];
  // history[0] is newest compact; last may be fuller record with same savedAt.
  const current = history[0] || doc.last || null;
  const previous = history[1] || null;
  return { current, previous, delta: buildOpsDigestWeekDelta(current, previous) };
}

/**
 * Parse app_settings row / value into a safe history document.
 * @param {object|null|undefined} rowOrValue
 */
export function parseOpsDigestHistoryRow(rowOrValue) {
  const empty = {
    version: 1,
    key: OPS_DIGEST_HISTORY_KEY,
    last: null,
    history: [],
    updatedAt: null,
  };

  if (!rowOrValue) return empty;

  const value =
    rowOrValue.value && typeof rowOrValue.value === 'object'
      ? rowOrValue.value
      : rowOrValue && typeof rowOrValue === 'object' && !rowOrValue.key
        ? rowOrValue
        : rowOrValue?.value || null;

  if (!value || typeof value !== 'object') return empty;

  const last = value.last && typeof value.last === 'object' ? value.last : null;
  const history = Array.isArray(value.history)
    ? value.history.filter((h) => h && typeof h === 'object').slice(0, OPS_DIGEST_HISTORY_MAX)
    : [];

  return {
    version: Number(value.version) || 1,
    key: OPS_DIGEST_HISTORY_KEY,
    last,
    history,
    updatedAt: value.updatedAt || last?.savedAt || rowOrValue.updated_at || null,
  };
}
