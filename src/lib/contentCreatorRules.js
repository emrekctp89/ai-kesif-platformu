/**
 * Shared rules for content-creator applications (UI + server actions).
 * Point values mirror live reputation_events / quests tables.
 */

export const MIN_CREATOR_REPUTATION = Number(process.env.CONTENT_CREATOR_MIN_REPUTATION || 10);

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
 * Summarize daily quests for the creator gate.
 * @param {Array} quests - user_daily_quests rows with nested quests
 */
export function summarizeDailyQuests(quests) {
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
      actionType: row?.quests?.action_type || '',
      reward,
      target,
      current,
      done,
      progress: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
    };
  });

  return {
    items,
    openCount,
    doneCount,
    availablePoints,
    completedPoints,
    totalPossible: availablePoints + completedPoints,
  };
}
