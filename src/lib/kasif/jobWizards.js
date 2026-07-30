/**
 * Kâşif job-wizard structure.
 *
 * User-facing copy lives in messages/{locale}.json under KasifJobWizards.
 * Only stable IDs remain here so copy has a single next-intl source of truth.
 */

const WIZARD_PARTS = {
  'presentation-creation': [['open', 'brief', 'outline', 'first-deck'], ['pitch-outline']],
  'image-generation': [['open', 'brief', 'generate', 'select'], ['social-visual']],
  'coding-assistant': [['open', 'context', 'scaffold', 'run'], ['feature-spec']],
  'seo-optimization': [['open', 'target', 'keywords', 'actions'], ['seo-brief']],
  'email-writing': [['open', 'audience', 'draft', 'polish'], ['cold-email']],
  'chatbot-assistant': [['open', 'task', 'iterate', 'save'], ['daily-helper']],
  'content-writing': [['open', 'brief', 'outline', 'draft'], ['blog-brief']],
  'workflow-automation': [['open', 'map', 'connect', 'test'], ['automation-map']],
  'meeting-notes': [['open', 'input', 'transcript', 'actions'], ['summary-format']],
  'logo-design': [['open', 'brand', 'variants', 'export'], ['logo-brief']],
  'video-generation': [['open', 'script', 'generate', 'export'], ['video-brief']],
  'voice-generation': [['open', 'script', 'generate', 'export'], ['voice-script']],
  'music-generation': [['open', 'prompt', 'generate', 'export'], ['music-prompt']],
  'data-analysis': [['open', 'question', 'analyze', 'export'], ['analysis-q']],
  translation: [['open', 'source', 'translate', 'export'], ['translate-brief']],
  'ui-design': [['open', 'brief', 'design', 'export'], ['ui-brief']],
  'customer-support': [['open', 'kb', 'reply', 'test'], ['support-reply']],
  'ecommerce-copy': [['open', 'product', 'copy', 'export'], ['pdp-copy']],
  'sales-crm': [['open', 'stages', 'outreach', 'task'], ['crm-setup']],
  'learning-tutor': [['open', 'goal', 'plan', 'practice'], ['lesson']],
  'legal-review': [['open', 'scope', 'risks', 'summary'], ['legal-scope']],
  'three-d-generation': [['open', 'brief', 'generate', 'export'], ['3d-brief']],
};

function buildDefinition(id, [stepIds, promptIds]) {
  return {
    id,
    steps: stepIds.map((stepId) => ({ id: stepId })),
    prompts: promptIds.map((promptId) => ({ id: promptId })),
  };
}

export const DEFAULT_JOB_WIZARD = buildDefinition('default', [
  ['open', 'configure', 'first-output'],
  [],
]);

export const JOB_WIZARDS = Object.fromEntries(
  Object.entries(WIZARD_PARTS).map(([id, parts]) => [id, buildDefinition(id, parts)])
);

function normalizeCatalog(messages) {
  if (!messages || typeof messages !== 'object') return {};
  return messages.wizards && typeof messages.wizards === 'object' ? messages.wizards : messages;
}

function localizeDefinition(definition, messages) {
  const copy = normalizeCatalog(messages)[definition.id] || {};
  const copySteps = new Map((copy.steps || []).map((step) => [step.id, step]));
  const copyPrompts = new Map((copy.prompts || []).map((prompt) => [prompt.id, prompt]));

  return {
    id: definition.id,
    title: copy.title || '',
    hint: copy.hint || '',
    firstResultHint: copy.firstResultHint || '',
    steps: definition.steps.map((step) => ({
      id: step.id,
      label: copySteps.get(step.id)?.label || step.id,
      description: copySteps.get(step.id)?.description || null,
    })),
    prompts: definition.prompts.map((prompt) => ({
      id: prompt.id,
      title: copyPrompts.get(prompt.id)?.title || prompt.id,
      body: copyPrompts.get(prompt.id)?.body || '',
    })),
  };
}

/**
 * @param {string[]|string|null|undefined} goals
 * @param {Record<string, unknown>} messages KasifJobWizards next-intl namespace
 */
export function resolveJobWizard(goals = [], messages = {}) {
  const list = Array.isArray(goals) ? goals : typeof goals === 'string' && goals ? [goals] : [];

  for (const goal of list) {
    const key = String(goal || '').trim();
    if (key && JOB_WIZARDS[key]) return localizeDefinition(JOB_WIZARDS[key], messages);
  }

  return localizeDefinition(DEFAULT_JOB_WIZARD, messages);
}

export function listJobWizardGoalIds() {
  return Object.keys(JOB_WIZARDS);
}
