/**
 * Kâşif job completion funnel helpers (pure, testable).
 *
 * job_stated → tool_recommended → tool_selected → setup_started
 *   → setup_completed → first_result → job_done
 */

export const KASIF_FUNNEL_STAGES = [
  'job_stated',
  'tool_recommended',
  'tool_selected',
  'setup_started',
  'setup_completed',
  'first_result',
  'job_done',
];

const STAGE_RANK = Object.fromEntries(KASIF_FUNNEL_STAGES.map((stage, index) => [stage, index]));

export function isValidFunnelStage(stage) {
  return Object.prototype.hasOwnProperty.call(STAGE_RANK, stage);
}

export function funnelStageRank(stage) {
  return isValidFunnelStage(stage) ? STAGE_RANK[stage] : -1;
}

function cleanText(value, max = 200) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, max);
}

function asIso(value) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeSelectedTool(tool) {
  if (!tool || typeof tool !== 'object') return null;
  const id = cleanText(tool.id, 80);
  const slug = cleanText(tool.slug, 120);
  const title = cleanText(tool.title || tool.name, 160);
  if (!id && !slug && !title) return null;
  return {
    ...(id ? { id } : {}),
    ...(slug ? { slug } : {}),
    ...(title ? { title } : {}),
  };
}

/**
 * @param {unknown} value
 * @returns {{
 *   stages: Record<string, string>,
 *   selected_tool: object|null,
 *   minutes_to_first_result: number|null,
 *   events: Array<object>,
 * }}
 */
export function normalizeFunnel(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const stages = {};
  const rawStages = raw.stages && typeof raw.stages === 'object' ? raw.stages : {};
  for (const stage of KASIF_FUNNEL_STAGES) {
    if (rawStages[stage]) stages[stage] = asIso(rawStages[stage]);
  }

  const events = Array.isArray(raw.events)
    ? raw.events
        .filter((event) => event && typeof event === 'object' && isValidFunnelStage(event.stage))
        .slice(-40)
        .map((event) => ({
          stage: event.stage,
          at: asIso(event.at),
          ...(event.meta && typeof event.meta === 'object' ? { meta: event.meta } : {}),
        }))
    : [];

  const minutes =
    raw.minutes_to_first_result == null || raw.minutes_to_first_result === ''
      ? null
      : Number(raw.minutes_to_first_result);

  const resultArtifact =
    raw.result_artifact && typeof raw.result_artifact === 'object'
      ? {
          goal: cleanText(raw.result_artifact.goal, 80) || null,
          char_count: Number.isFinite(Number(raw.result_artifact.char_count))
            ? Math.min(Math.max(0, Number(raw.result_artifact.char_count)), 100000)
            : null,
          fingerprint: cleanText(raw.result_artifact.fingerprint, 80) || null,
          pattern_hit: Boolean(raw.result_artifact.pattern_hit),
          preview: cleanText(raw.result_artifact.preview, 240) || null,
          bridge: cleanText(raw.result_artifact.bridge, 40) || null,
          packId: cleanText(raw.result_artifact.packId, 80) || null,
          runner_source:
            cleanText(raw.result_artifact.runner_source || raw.result_artifact.source, 40) || null,
          at: raw.result_artifact.at ? asIso(raw.result_artifact.at) : null,
        }
      : null;

  return {
    stages,
    selected_tool: normalizeSelectedTool(raw.selected_tool),
    minutes_to_first_result:
      Number.isFinite(minutes) && minutes >= 0 ? Math.min(minutes, 24 * 60) : null,
    events,
    result_artifact: resultArtifact,
  };
}

/**
 * Highest stage reached (by order), or null.
 * @param {ReturnType<typeof normalizeFunnel>|object|null} funnel
 */
export function highestFunnelStage(funnel) {
  const normalized = normalizeFunnel(funnel);
  let best = null;
  let bestRank = -1;
  for (const stage of KASIF_FUNNEL_STAGES) {
    if (normalized.stages[stage] && STAGE_RANK[stage] > bestRank) {
      best = stage;
      bestRank = STAGE_RANK[stage];
    }
  }
  return best;
}

/**
 * Apply a stage transition. Stages are monotonic: already-recorded timestamps stay.
 * @param {object|null|undefined} existing
 * @param {string} stage
 * @param {{
 *   at?: string,
 *   selectedTool?: object|null,
 *   minutesToFirstResult?: number|null,
 *   meta?: object,
 * }} [options]
 */
export function applyFunnelStage(existing, stage, options = {}) {
  if (!isValidFunnelStage(stage)) {
    throw new Error(`Invalid funnel stage: ${stage}`);
  }

  const current = normalizeFunnel(existing);
  const at = asIso(options.at);
  const nextStages = { ...current.stages };

  // Fill any missing prerequisites with the same timestamp so the funnel is continuous.
  const targetRank = STAGE_RANK[stage];
  for (const candidate of KASIF_FUNNEL_STAGES) {
    if (STAGE_RANK[candidate] <= targetRank && !nextStages[candidate]) {
      nextStages[candidate] = at;
    }
  }

  const selectedTool = normalizeSelectedTool(options.selectedTool) || current.selected_tool || null;

  let minutes = current.minutes_to_first_result;
  if (options.minutesToFirstResult != null && options.minutesToFirstResult !== '') {
    const parsed = Number(options.minutesToFirstResult);
    if (Number.isFinite(parsed) && parsed >= 0) {
      minutes = Math.min(parsed, 24 * 60);
    }
  }

  const meta =
    options.meta && typeof options.meta === 'object'
      ? Object.fromEntries(
          Object.entries(options.meta)
            .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
            .slice(0, 12)
            .map(([key, value]) => [cleanText(key, 40), value])
        )
      : null;

  const event = {
    stage,
    at,
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  };

  return {
    stages: nextStages,
    selected_tool: selectedTool,
    minutes_to_first_result: minutes,
    events: [...current.events, event].slice(-40),
    result_artifact: current.result_artifact || null,
  };
}

/**
 * Seed funnel when a recommendation answer is recorded.
 * Meta / soft-landing answers do not start a job funnel.
 */
export function seedFunnelFromResponse(modelResponse = {}, groundedResponse = {}) {
  const intent = modelResponse.intent || groundedResponse.intent || {};
  const isSoft =
    modelResponse.softLanding === true ||
    modelResponse.metaKind === 'soft-landing' ||
    intent.meta === 'soft-landing';
  const isMeta = Boolean(modelResponse.meta || intent.meta) && !isSoft;
  if (isSoft || isMeta) return null;

  const sources = Array.isArray(groundedResponse.sources)
    ? groundedResponse.sources
    : Array.isArray(modelResponse.sources)
      ? modelResponse.sources
      : [];
  const goals = Array.isArray(intent.goals) ? intent.goals.filter(Boolean) : [];
  const hasJob = goals.length > 0 || sources.length > 0;
  if (!hasJob) return null;

  let funnel = applyFunnelStage({}, 'job_stated', {
    meta: {
      goals: goals.slice(0, 4).join(','),
      source_count: sources.length,
    },
  });

  if (sources.length > 0) {
    funnel = applyFunnelStage(funnel, 'tool_recommended', {
      meta: { source_count: sources.length },
    });
  }

  return funnel;
}

/**
 * Aggregate funnel conversion stats for admin quality panel.
 * @param {Array<{ funnel?: object, created_at?: string }>} interactions
 */
export function buildJobFunnelStats(interactions = []) {
  const rows = Array.isArray(interactions) ? interactions : [];
  const counts = Object.fromEntries(KASIF_FUNNEL_STAGES.map((stage) => [stage, 0]));
  let withFunnel = 0;
  const minutesSamples = [];
  const selectedTools = new Map();

  for (const row of rows) {
    const funnel = normalizeFunnel(row?.funnel);
    const hasAny = Object.keys(funnel.stages).length > 0;
    if (!hasAny) continue;
    withFunnel += 1;
    for (const stage of KASIF_FUNNEL_STAGES) {
      if (funnel.stages[stage]) counts[stage] += 1;
    }
    if (funnel.minutes_to_first_result != null) {
      minutesSamples.push(funnel.minutes_to_first_result);
    }
    const toolKey =
      funnel.selected_tool?.slug || funnel.selected_tool?.id || funnel.selected_tool?.title;
    if (toolKey) {
      const label = funnel.selected_tool?.title || toolKey;
      const bucket = selectedTools.get(toolKey) || { key: toolKey, label, count: 0 };
      bucket.count += 1;
      selectedTools.set(toolKey, bucket);
    }
  }

  function rate(numerator, denominator) {
    if (!denominator) return null;
    return Number(((numerator / denominator) * 100).toFixed(1));
  }

  const base = counts.job_stated || withFunnel;
  const avgMinutes =
    minutesSamples.length > 0
      ? Number(
          (minutesSamples.reduce((sum, value) => sum + value, 0) / minutesSamples.length).toFixed(1)
        )
      : null;

  const topSelectedTools = [...selectedTools.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  let bridgePasteCount = 0;
  let runnerCount = 0;
  const bridgeGoals = new Map();
  const packBuckets = new Map();
  /** @type {Record<string, number>} */
  const runnerSourceCounts = {
    partner: 0,
    gemini: 0,
    local: 0,
    'local-fallback': 0,
    provider: 0,
    other: 0,
  };

  function normalizeRunnerSource(raw) {
    const key = String(raw || '')
      .toLowerCase()
      .trim();
    if (!key) return null;
    if (key === 'local-fallback' || key === 'local_fallback') return 'local-fallback';
    if (key === 'partner' || key === 'gemini' || key === 'local' || key === 'provider') return key;
    return 'other';
  }

  function extractRunnerSource(funnel) {
    const fromArtifact = funnel.result_artifact?.runner_source || funnel.result_artifact?.source;
    if (fromArtifact) return normalizeRunnerSource(fromArtifact);
    const event = (funnel.events || []).find(
      (e) => e?.stage === 'first_result' && (e?.meta?.runner_source || e?.meta?.source)
    );
    return normalizeRunnerSource(event?.meta?.runner_source || event?.meta?.source);
  }

  for (const row of rows) {
    const funnel = normalizeFunnel(row?.funnel);
    if (funnel.result_artifact?.bridge === 'paste') {
      bridgePasteCount += 1;
      const g = funnel.result_artifact.goal || '(unknown)';
      bridgeGoals.set(g, (bridgeGoals.get(g) || 0) + 1);
    }
    const isRunner = funnel.result_artifact?.bridge === 'runner';
    if (isRunner) {
      runnerCount += 1;
      const sourceKey = extractRunnerSource(funnel) || 'other';
      runnerSourceCounts[sourceKey] = (runnerSourceCounts[sourceKey] || 0) + 1;
    }

    const packId =
      row?.intent?.packId ||
      funnel.result_artifact?.packId ||
      funnel.events?.find((e) => e?.meta?.packId)?.meta?.packId ||
      null;
    if (packId) {
      const key = String(packId);
      const bucket = packBuckets.get(key) || {
        packId: key,
        total: 0,
        firstResult: 0,
        jobDone: 0,
        runner: 0,
        sources: {},
      };
      bucket.total += 1;
      if (funnel.stages?.first_result) bucket.firstResult += 1;
      if (funnel.stages?.job_done) bucket.jobDone += 1;
      if (isRunner) {
        bucket.runner += 1;
        const sourceKey = extractRunnerSource(funnel) || 'other';
        bucket.sources[sourceKey] = (bucket.sources[sourceKey] || 0) + 1;
      }
      packBuckets.set(key, bucket);
    }
  }

  const packStats = [...packBuckets.values()]
    .map((bucket) => ({
      ...bucket,
      firstResultRate: rate(bucket.firstResult, bucket.total),
      jobDoneRate: rate(bucket.jobDone, bucket.total),
      runnerRate: rate(bucket.runner, bucket.total),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const runnerSourceMix = Object.entries(runnerSourceCounts)
    .filter(([, count]) => count > 0)
    .map(([source, count]) => ({
      source,
      count,
      rate: rate(count, runnerCount),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    withFunnel,
    counts,
    conversion: {
      recommendedOfStated: rate(counts.tool_recommended, counts.job_stated || base),
      selectedOfRecommended: rate(counts.tool_selected, counts.tool_recommended),
      setupOfSelected: rate(counts.setup_started, counts.tool_selected),
      firstResultOfSetup: rate(counts.first_result, counts.setup_started),
      doneOfFirstResult: rate(counts.job_done, counts.first_result),
      firstResultOfStated: rate(counts.first_result, counts.job_stated || base),
      doneOfStated: rate(counts.job_done, counts.job_stated || base),
      bridgeOfFirstResult: rate(bridgePasteCount, counts.first_result),
      runnerOfFirstResult: rate(runnerCount, counts.first_result),
    },
    avgMinutesToFirstResult: avgMinutes,
    firstResultSamples: minutesSamples.length,
    topSelectedTools,
    bridgePasteCount,
    runnerCount,
    runnerSourceCounts,
    runnerSourceMix,
    bridgeGoals: [...bridgeGoals.entries()]
      .map(([goal, count]) => ({ goal, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    packStats,
  };
}
