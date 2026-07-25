/**
 * P3 copy-paste result bridge — prove first_result without OAuth.
 * Supported niches produce text artifacts users can paste back.
 */

/** @typedef {{ minChars: number, maxChars: number, patterns?: RegExp[] }} BridgeRule */

/** @type {Record<string, BridgeRule>} */
export const RESULT_BRIDGE_GOALS = {
  'email-writing': {
    minChars: 80,
    maxChars: 12000,
    // subject-ish line or greeting-ish body
    patterns: [
      /konu\s*:/i,
      /subject\s*:/i,
      /merhaba|selam|hello|hi\b|dear\b/i,
      /saygılarımla|best regards|teşekkür/i,
    ],
  },
  'content-writing': {
    minChars: 200,
    maxChars: 40000,
    patterns: [/^#{1,3}\s+\S+/m, /\n\n/, /giriş|sonuç|introduction|conclusion/i],
  },
  'presentation-creation': {
    minChars: 100,
    maxChars: 20000,
    patterns: [/slayt|slide|outline|anahat/i, /^\s*[-*•\d]+[.)]\s+\S+/m],
  },
};

export function isResultBridgeGoal(goal) {
  const key = String(goal || '').trim();
  return Boolean(key && RESULT_BRIDGE_GOALS[key]);
}

/**
 * First matching supported goal from intent goals list.
 * @param {string[]|string|null|undefined} goals
 */
export function resolveBridgeGoal(goals = []) {
  const list = Array.isArray(goals) ? goals : typeof goals === 'string' && goals ? [goals] : [];
  for (const goal of list) {
    if (isResultBridgeGoal(goal)) return String(goal).trim();
  }
  return null;
}

function cleanArtifact(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Lightweight fingerprint (not crypto-secure) for dedupe/analytics.
 * @param {string} text
 */
export function fingerprintArtifact(text) {
  const input = cleanArtifact(text);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a_${(hash >>> 0).toString(16)}`;
}

/**
 * @param {string|null} goal
 * @param {string} text
 * @returns {{
 *   ok: boolean,
 *   reason?: string,
 *   goal?: string,
 *   charCount?: number,
 *   preview?: string,
 *   fingerprint?: string,
 *   patternHit?: boolean,
 * }}
 */
export function validateBridgeArtifact(goal, text) {
  const bridgeGoal = isResultBridgeGoal(goal) ? String(goal).trim() : null;
  if (!bridgeGoal) {
    return { ok: false, reason: 'unsupported_goal' };
  }

  const rule = RESULT_BRIDGE_GOALS[bridgeGoal];
  const artifact = cleanArtifact(text);
  if (!artifact) {
    return { ok: false, reason: 'empty', goal: bridgeGoal };
  }

  if (artifact.length < rule.minChars) {
    return {
      ok: false,
      reason: 'too_short',
      goal: bridgeGoal,
      charCount: artifact.length,
    };
  }

  if (artifact.length > rule.maxChars) {
    return {
      ok: false,
      reason: 'too_long',
      goal: bridgeGoal,
      charCount: artifact.length,
    };
  }

  const patterns = Array.isArray(rule.patterns) ? rule.patterns : [];
  const patternHit = patterns.length === 0 ? true : patterns.some((re) => re.test(artifact));

  // Soft signal: short emails without pattern still OK if long enough; content needs pattern OR 400+ chars
  if (bridgeGoal === 'content-writing' && !patternHit && artifact.length < 400) {
    return {
      ok: false,
      reason: 'weak_structure',
      goal: bridgeGoal,
      charCount: artifact.length,
      patternHit: false,
    };
  }

  return {
    ok: true,
    goal: bridgeGoal,
    charCount: artifact.length,
    preview: artifact.slice(0, 240),
    fingerprint: fingerprintArtifact(artifact),
    patternHit,
  };
}

/**
 * Estimate minutes from setup_started / job_stated ISO timestamps.
 * @param {object|null|undefined} funnel
 * @param {number} [fallback=15]
 */
export function estimateMinutesFromFunnel(funnel, fallback = 15) {
  const stages = funnel?.stages && typeof funnel.stages === 'object' ? funnel.stages : {};
  const start =
    stages.setup_started || stages.tool_selected || stages.tool_recommended || stages.job_stated;
  if (!start) return fallback;
  const startMs = new Date(start).getTime();
  if (!Number.isFinite(startMs)) return fallback;
  const minutes = Math.round((Date.now() - startMs) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) return 1;
  return Math.min(minutes, 24 * 60);
}
