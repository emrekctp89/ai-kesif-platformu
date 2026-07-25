/**
 * Workmind ↔ Kâşif unified job session helpers (pure, client-safe).
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   description?: string,
 *   categorySlug?: string|null,
 *   done?: boolean,
 *   selectedTool?: { id?: string|number, slug?: string, name?: string }|null,
 * }} JobSessionStep
 *
 * @typedef {{
 *   id: string,
 *   prompt: string,
 *   goals: string[],
 *   steps: JobSessionStep[],
 *   interactionId?: string|null,
 *   feedbackToken?: string|null,
 *   source?: string,
 *   createdAt: string,
 *   updatedAt: string,
 * }} JobSession
 */

export function jobSessionStorageKey(locale = 'tr') {
  return `workmind-job-session-v1:${locale || 'tr'}`;
}

export function createJobSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @param {{
 *   prompt: string,
 *   goals?: string[],
 *   steps?: Array<object>,
 *   interactionId?: string|null,
 *   feedbackToken?: string|null,
 *   source?: string,
 *   id?: string,
 * }} input
 * @returns {JobSession}
 */
export function createJobSession(input = {}) {
  const now = new Date().toISOString();
  const prompt = String(input.prompt || '')
    .trim()
    .slice(0, 800);
  const goals = Array.isArray(input.goals)
    ? input.goals
        .map((g) => String(g || '').trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];

  const steps = (Array.isArray(input.steps) ? input.steps : [])
    .map((step, index) => normalizeStep(step, index))
    .filter(Boolean)
    .slice(0, 8);

  return {
    id: String(input.id || createJobSessionId()),
    prompt,
    goals,
    steps,
    interactionId: input.interactionId || null,
    feedbackToken: input.feedbackToken || null,
    source: String(input.source || 'workmind').slice(0, 40),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeStep(step, index) {
  if (!step || typeof step !== 'object') return null;
  const id = String(step.id || `step-${index + 1}`).slice(0, 40);
  const label = String(step.label || step.labelText || `Adım ${index + 1}`)
    .trim()
    .slice(0, 80);
  if (!label) return null;
  return {
    id,
    label,
    description: String(step.description || '')
      .trim()
      .slice(0, 220),
    categorySlug: step.categorySlug ? String(step.categorySlug).slice(0, 80) : null,
    done: Boolean(step.done),
    selectedTool: step.selectedTool
      ? {
          id: step.selectedTool.id,
          slug: step.selectedTool.slug || null,
          name: step.selectedTool.name || step.selectedTool.title || null,
        }
      : null,
  };
}

/**
 * @param {unknown} value
 * @returns {JobSession|null}
 */
export function normalizeJobSession(value) {
  if (!value || typeof value !== 'object') return null;
  const prompt = String(value.prompt || '').trim();
  if (prompt.length < 3) return null;
  return createJobSession({
    id: value.id,
    prompt,
    goals: value.goals,
    steps: value.steps,
    interactionId: value.interactionId,
    feedbackToken: value.feedbackToken,
    source: value.source,
  });
}

/**
 * @param {JobSession} session
 * @param {string} stepId
 * @param {Partial<JobSessionStep>} [patch]
 */
export function updateJobSessionStep(session, stepId, patch = {}) {
  if (!session) return session;
  const id = String(stepId || '');
  const steps = (session.steps || []).map((step) =>
    step.id === id
      ? {
          ...step,
          ...patch,
          id: step.id,
          label: patch.label != null ? String(patch.label).slice(0, 80) : step.label,
        }
      : step
  );
  return {
    ...session,
    steps,
    updatedAt: new Date().toISOString(),
  };
}

export function markJobSessionStepDone(session, stepId, done = true) {
  return updateJobSessionStep(session, stepId, { done: Boolean(done) });
}

export function selectToolForJobStep(session, stepId, tool) {
  if (!tool) return updateJobSessionStep(session, stepId, { selectedTool: null });
  return updateJobSessionStep(session, stepId, {
    selectedTool: {
      id: tool.id,
      slug: tool.slug || null,
      name: tool.name || tool.title || null,
    },
  });
}

/**
 * @param {JobSession|null|undefined} session
 */
export function getJobSessionProgress(session) {
  const steps = Array.isArray(session?.steps) ? session.steps : [];
  const total = steps.length;
  const done = steps.filter((step) => step.done).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const nextStep = steps.find((step) => !step.done) || null;
  const complete = total > 0 && done === total;
  return { total, done, percent, nextStep, complete };
}

/**
 * Build session from Workmind generate response nodes.
 * @param {string} prompt
 * @param {Array<object>} nodes
 * @param {{ goals?: string[], interactionId?: string|null, feedbackToken?: string|null, source?: string }} [options]
 */
export function jobSessionFromWorkflow(prompt, nodes = [], options = {}) {
  const steps = (Array.isArray(nodes) ? nodes : []).map((node, index) => ({
    id: node.id || `step-${index + 1}`,
    label: node.label || node.data?.raw?.label || node.data?.labelText,
    description: node.description || node.data?.raw?.description || '',
    categorySlug: node.categorySlug || node.data?.raw?.categorySlug || null,
    done: false,
  }));
  return createJobSession({
    prompt,
    goals: options.goals,
    steps,
    interactionId: options.interactionId,
    feedbackToken: options.feedbackToken,
    source: options.source || 'workmind',
  });
}

export function buildWorkmindHandoffUrl(prompt, options = {}) {
  const locale = options.locale === 'en' ? 'en' : 'tr';
  const base = locale === 'en' ? '/en/workmind' : '/workmind';
  const params = new URLSearchParams();
  const goal = String(prompt || '')
    .trim()
    .slice(0, 800);
  if (goal) params.set('goal', goal);
  if (options.from) params.set('from', String(options.from));
  if (options.interactionId) params.set('interactionId', String(options.interactionId));
  if (options.feedbackToken) params.set('feedbackToken', String(options.feedbackToken));
  if (Array.isArray(options.goals) && options.goals.length) {
    params.set('goals', options.goals.slice(0, 4).join(','));
  }
  if (options.autoGenerate) params.set('auto', '1');
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
