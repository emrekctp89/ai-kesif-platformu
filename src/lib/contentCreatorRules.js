/**
 * Shared rules for content-creator applications (UI + server actions).
 */

export const MIN_CREATOR_REPUTATION = Number(process.env.CONTENT_CREATOR_MIN_REPUTATION || 10);

/**
 * Roadmap steps to earn reputation toward creator access.
 * `href` points to a real product surface users can act on immediately.
 */
export const CREATOR_REPUTATION_ROADMAP = [
  {
    id: 'profile',
    href: '/profile',
    pointsLabel: '+1–5',
    titleKey: 'roadProfileTitle',
    bodyKey: 'roadProfileBody',
    ctaKey: 'roadProfileCta',
  },
  {
    id: 'explore',
    href: '/',
    pointsLabel: '+1–3',
    titleKey: 'roadRateTitle',
    bodyKey: 'roadRateBody',
    ctaKey: 'roadRateCta',
  },
  {
    id: 'comment',
    href: '/',
    pointsLabel: '+2–5',
    titleKey: 'roadCommentTitle',
    bodyKey: 'roadCommentBody',
    ctaKey: 'roadCommentCta',
  },
  {
    id: 'submit',
    href: '/submit',
    pointsLabel: '+10–25',
    titleKey: 'roadSubmitTitle',
    bodyKey: 'roadSubmitBody',
    ctaKey: 'roadSubmitCta',
  },
  {
    id: 'learn',
    href: '/ogren',
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
