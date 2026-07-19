import {
  MIN_CREATOR_REPUTATION,
  REPUTATION_AWARDS,
  isReputationEligible,
  questActionDeepLink,
  reputationProgress,
  summarizeDailyQuests,
} from '@/lib/contentCreatorRules';

describe('contentCreatorRules', () => {
  it('exposes a positive min reputation default', () => {
    expect(MIN_CREATOR_REPUTATION).toBeGreaterThan(0);
  });

  it('documents known award values', () => {
    expect(REPUTATION_AWARDS.rateTool).toBe(1);
    expect(REPUTATION_AWARDS.comment).toBe(2);
    expect(REPUTATION_AWARDS.toolSuggestionApproved).toBe(25);
  });

  it('checks eligibility against the threshold', () => {
    expect(isReputationEligible(9, 10)).toBe(false);
    expect(isReputationEligible(10, 10)).toBe(true);
    expect(isReputationEligible(25, 10)).toBe(true);
  });

  it('computes progress remaining and percent', () => {
    const p = reputationProgress(4, 10);
    expect(p.current).toBe(4);
    expect(p.target).toBe(10);
    expect(p.remaining).toBe(6);
    expect(p.percent).toBe(40);
  });

  it('summarizes daily quests available points', () => {
    const summary = summarizeDailyQuests([
      {
        quest_id: 1,
        is_completed: false,
        current_progress: 1,
        quests: {
          description: 'Rate 3',
          action_type: 'rating',
          target_count: 3,
          reputation_reward: 10,
        },
      },
      {
        quest_id: 2,
        is_completed: true,
        current_progress: 1,
        quests: {
          description: 'Favorite',
          action_type: 'favorite',
          target_count: 1,
          reputation_reward: 5,
        },
      },
    ]);
    expect(summary.openCount).toBe(1);
    expect(summary.doneCount).toBe(1);
    expect(summary.availablePoints).toBe(10);
    expect(summary.completedPoints).toBe(5);
    expect(summary.items[0].done).toBe(false);
    expect(summary.items[0].href).toBeTruthy();
  });

  it('maps quest action types to deep links', () => {
    expect(
      questActionDeepLink('favorite', { featuredToolSlug: 'notion-ai' }).href
    ).toBe('/tool/notion-ai');
    expect(questActionDeepLink('rating', { popularToolSlug: 'chatgpt' }).href).toBe(
      '/tool/chatgpt'
    );
    expect(questActionDeepLink('follow_user', { sampleUsername: 'inventor' }).href).toBe(
      '/u/inventor'
    );
  });
});

