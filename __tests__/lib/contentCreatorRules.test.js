import {
  CREATOR_POST_TEMPLATES,
  MIN_CREATOR_REPUTATION,
  MIN_POST_CONTENT_LENGTH,
  MIN_POST_TITLE_LENGTH,
  REPUTATION_AWARDS,
  buildReviewChecklist,
  getCreatorPostTemplate,
  isReputationEligible,
  plainTextFromMarkdown,
  questActionDeepLink,
  reputationProgress,
  summarizeCreatorStudio,
  summarizeDailyQuests,
  validatePostForReview,
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
    expect(questActionDeepLink('favorite', { featuredToolSlug: 'notion-ai' }).href).toBe(
      '/tool/notion-ai'
    );
    expect(questActionDeepLink('rating', { popularToolSlug: 'chatgpt' }).href).toBe(
      '/tool/chatgpt'
    );
    expect(questActionDeepLink('follow_user', { sampleUsername: 'inventor' }).href).toBe(
      '/u/inventor'
    );
  });

  it('strips markdown noise for plain-text length', () => {
    expect(plainTextFromMarkdown('## Hello **world**')).toBe('Hello world');
    expect(plainTextFromMarkdown('[link](https://x.com)')).toBe('link');
  });

  it('validates posts before review', () => {
    expect(validatePostForReview({ title: 'Hi', content: 'x'.repeat(200) }).ok).toBe(false);
    expect(
      validatePostForReview({
        title: 'A'.repeat(MIN_POST_TITLE_LENGTH),
        content: 'x'.repeat(MIN_POST_CONTENT_LENGTH - 1),
      }).reason
    ).toBe('content');
    expect(
      validatePostForReview({
        title: 'A'.repeat(MIN_POST_TITLE_LENGTH),
        content: 'x'.repeat(MIN_POST_CONTENT_LENGTH),
      }).ok
    ).toBe(true);
  });

  it('summarizes studio posts by status', () => {
    const s = summarizeCreatorStudio([
      { status: 'Taslak', type: 'Yazı', updated_at: '2026-01-02T00:00:00Z' },
      {
        status: 'Yayınlandı',
        type: 'Rehber',
        published_at: '2026-01-03T00:00:00Z',
        view_count: 12,
      },
      {
        status: 'Yayınlandı',
        type: 'Yazı',
        published_at: '2026-01-01T00:00:00Z',
        view_count: 8,
      },
      { status: 'Reddedildi', type: 'Yazı' },
      { status: 'İncelemede', type: 'Rehber' },
    ]);
    expect(s.total).toBe(5);
    expect(s.draft).toBe(1);
    expect(s.published).toBe(2);
    expect(s.rejected).toBe(1);
    expect(s.review).toBe(1);
    expect(s.guides).toBe(2);
    expect(s.articles).toBe(3);
    expect(s.publishRate).toBe(67); // 2/3 decided
    expect(s.lastPublishedAt).toBe('2026-01-03T00:00:00.000Z');
    expect(s.totalViews).toBe(20);
  });

  it('exposes starter templates with stable ids', () => {
    expect(CREATOR_POST_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    expect(getCreatorPostTemplate('comparison').type).toBe('Rehber');
    expect(getCreatorPostTemplate('missing').id).toBe('blank');
    expect(getCreatorPostTemplate('listicle').contentKey).toBeTruthy();
  });

  it('builds review checklist with required and optional items', () => {
    const weak = buildReviewChecklist({
      title: 'Hi',
      content: 'short',
      description: '',
      coverUrl: '',
      toolCount: 0,
    });
    expect(weak.requiredReady).toBe(false);
    expect(weak.score).toBe(0);

    const strong = buildReviewChecklist({
      title: 'A'.repeat(MIN_POST_TITLE_LENGTH),
      content: 'x'.repeat(MIN_POST_CONTENT_LENGTH),
      description: 'y'.repeat(40),
      coverUrl: 'https://example.com/c.jpg',
      toolCount: 2,
    });
    expect(strong.requiredReady).toBe(true);
    expect(strong.score).toBe(5);
    expect(strong.optionalDone).toBe(3);
  });
});
