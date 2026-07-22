/**
 * Shared rules for content-creator applications (UI + server actions).
 * Point values mirror live reputation_events / quests tables.
 */

export const MIN_CREATOR_REPUTATION = Number(process.env.CONTENT_CREATOR_MIN_REPUTATION || 10);

/** Minimum plain-text length for title when submitting for review. */
export const MIN_POST_TITLE_LENGTH = 8;

/** Minimum plain-text length for body when submitting for review. */
export const MIN_POST_CONTENT_LENGTH = 120;

/** Debounce window for draft autosave (ms). */
export const CREATOR_AUTOSAVE_MS = 2500;

/**
 * Strip common Markdown noise so length checks reflect readable text.
 * @param {string} markdown
 * @returns {string}
 */
export function plainTextFromMarkdown(markdown) {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\[\]()|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate a post before review submission.
 * @param {{ title?: string, content?: string }} fields
 * @returns {{ ok: true } | { ok: false, reason: 'title' | 'content', current: number, min: number }}
 */
export function validatePostForReview({ title, content } = {}) {
  const titleLen = plainTextFromMarkdown(title).length;
  if (titleLen < MIN_POST_TITLE_LENGTH) {
    return {
      ok: false,
      reason: 'title',
      current: titleLen,
      min: MIN_POST_TITLE_LENGTH,
    };
  }
  const contentLen = plainTextFromMarkdown(content).length;
  if (contentLen < MIN_POST_CONTENT_LENGTH) {
    return {
      ok: false,
      reason: 'content',
      current: contentLen,
      min: MIN_POST_CONTENT_LENGTH,
    };
  }
  return { ok: true };
}

/**
 * Known reputation awards used for transparent UI copy.
 * Keep in sync with DB triggers / quest seed data.
 */
export const REPUTATION_AWARDS = {
  rateTool: 1,
  comment: 2,
  promptShare: 10,
  toolSuggestionApproved: 25,
  showcaseApproved: 50,
  dailyQuestTypical: '5–20',
};

/**
 * Static roadmap steps (always shown).
 * Daily quests are injected separately from live user_daily_quests.
 */
export const CREATOR_REPUTATION_ROADMAP = [
  {
    id: 'quests',
    href: '/profile',
    pointsExact: null,
    pointsLabel: `+${REPUTATION_AWARDS.dailyQuestTypical}`,
    titleKey: 'roadQuestsTitle',
    bodyKey: 'roadQuestsBody',
    ctaKey: 'roadQuestsCta',
  },
  {
    id: 'rate',
    href: '/',
    pointsExact: REPUTATION_AWARDS.rateTool,
    pointsLabel: `+${REPUTATION_AWARDS.rateTool}`,
    titleKey: 'roadRateTitle',
    bodyKey: 'roadRateBody',
    ctaKey: 'roadRateCta',
  },
  {
    id: 'comment',
    href: '/',
    pointsExact: REPUTATION_AWARDS.comment,
    pointsLabel: `+${REPUTATION_AWARDS.comment}`,
    titleKey: 'roadCommentTitle',
    bodyKey: 'roadCommentBody',
    ctaKey: 'roadCommentCta',
  },
  {
    id: 'submit',
    href: '/submit',
    pointsExact: REPUTATION_AWARDS.toolSuggestionApproved,
    pointsLabel: `+${REPUTATION_AWARDS.toolSuggestionApproved}`,
    titleKey: 'roadSubmitTitle',
    bodyKey: 'roadSubmitBody',
    ctaKey: 'roadSubmitCta',
  },
  {
    id: 'prompt',
    href: '/',
    pointsExact: REPUTATION_AWARDS.promptShare,
    pointsLabel: `+${REPUTATION_AWARDS.promptShare}`,
    titleKey: 'roadPromptTitle',
    bodyKey: 'roadPromptBody',
    ctaKey: 'roadPromptCta',
  },
  {
    id: 'learn',
    href: '/ogren',
    pointsExact: null,
    pointsLabel: '—',
    titleKey: 'roadLearnTitle',
    bodyKey: 'roadLearnBody',
    ctaKey: 'roadLearnCta',
  },
];

export function isReputationEligible(points, min = MIN_CREATOR_REPUTATION) {
  return Number(points || 0) >= Number(min || 0);
}

export function reputationProgress(points, min = MIN_CREATOR_REPUTATION) {
  const current = Math.max(0, Number(points || 0));
  const target = Math.max(1, Number(min || 1));
  const remaining = Math.max(0, target - current);
  const ratio = Math.min(1, current / target);
  return { current, target, remaining, ratio, percent: Math.round(ratio * 100) };
}

/**
 * Deep-link targets for daily quest action types.
 * @param {string} actionType
 * @param {{ featuredToolSlug?: string|null, popularToolSlug?: string|null, sampleUsername?: string|null }} [opts]
 */
export function questActionDeepLink(actionType, opts = {}) {
  const featured = opts.featuredToolSlug ? `/tool/${opts.featuredToolSlug}` : '/';
  const popular = opts.popularToolSlug ? `/tool/${opts.popularToolSlug}` : '/';
  const profileUser = opts.sampleUsername ? `/u/${opts.sampleUsername}` : '/profile';

  switch (String(actionType || '')) {
    case 'rating':
      return { href: popular, ctaKey: 'questCtaRate' };
    case 'comment':
      // Community showcase is soft-landed; complete via tool page comments.
      return { href: popular, ctaKey: 'questCtaComment' };
    case 'favorite':
      return { href: featured, ctaKey: 'questCtaFavorite' };
    case 'visit_tool':
      return { href: '/', ctaKey: 'questCtaVisit' };
    case 'follow_user':
      return { href: profileUser, ctaKey: 'questCtaFollow' };
    default:
      return { href: '/', ctaKey: 'questCtaDefault' };
  }
}

/**
 * Summarize daily quests for the creator gate.
 * @param {Array} quests - user_daily_quests rows with nested quests
 * @param {{ featuredToolSlug?: string|null, popularToolSlug?: string|null, sampleUsername?: string|null }} [linkOpts]
 */
export function summarizeDailyQuests(quests, linkOpts = {}) {
  const list = Array.isArray(quests) ? quests : [];
  let availablePoints = 0;
  let completedPoints = 0;
  let openCount = 0;
  let doneCount = 0;

  const items = list.map((row) => {
    const reward = Number(row?.quests?.reputation_reward || 0);
    const target = Number(row?.quests?.target_count || 1);
    const current = Number(row?.current_progress || 0);
    const done = Boolean(row?.is_completed);
    const actionType = row?.quests?.action_type || '';
    const deep = questActionDeepLink(actionType, linkOpts);
    if (done) {
      doneCount += 1;
      completedPoints += reward;
    } else {
      openCount += 1;
      availablePoints += reward;
    }
    return {
      id: row.quest_id || row.id,
      description: row?.quests?.description || '',
      actionType,
      reward,
      target,
      current,
      done,
      progress: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
      href: deep.href,
      ctaKey: deep.ctaKey,
    };
  });

  // Incomplete quests first so “Tamamla” actions are visible.
  items.sort((a, b) => Number(a.done) - Number(b.done));

  return {
    items,
    openCount,
    doneCount,
    availablePoints,
    completedPoints,
    totalPossible: availablePoints + completedPoints,
  };
}
