import {
  MIN_CREATOR_REPUTATION,
  isReputationEligible,
  reputationProgress,
} from '@/lib/contentCreatorRules';

describe('contentCreatorRules', () => {
  it('exposes a positive min reputation default', () => {
    expect(MIN_CREATOR_REPUTATION).toBeGreaterThan(0);
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
});
