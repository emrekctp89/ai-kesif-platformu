const {
  FREE_PRO_PACK_QUOTA,
  evaluatePackAccess,
  evaluateAllPackAccess,
  isProPackId,
} = require('../../src/lib/kasif/packAccess');

describe('packAccess', () => {
  it('proHint paketlerini tanır', () => {
    expect(isProPackId('content-studio')).toBe(true);
    expect(isProPackId('sales-outreach')).toBe(false);
  });

  it('ücretsiz paketi herkese açar', () => {
    const decision = evaluatePackAccess({
      packId: 'sales-outreach',
      isAuthenticated: false,
      isPro: false,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('free_pack');
  });

  it('pro pakette misafiri login ister', () => {
    const decision = evaluatePackAccess({
      packId: 'content-studio',
      isAuthenticated: false,
      isPro: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('login_required');
  });

  it('ücretsiz kota ve dolunca pro_required', () => {
    const withQuota = evaluatePackAccess({
      packId: 'content-studio',
      isAuthenticated: true,
      isPro: false,
      usedProPackRuns: 0,
    });
    expect(withQuota.allowed).toBe(true);
    expect(withQuota.freeRunsLeft).toBe(FREE_PRO_PACK_QUOTA);

    const exhausted = evaluatePackAccess({
      packId: 'content-studio',
      isAuthenticated: true,
      isPro: false,
      usedProPackRuns: FREE_PRO_PACK_QUOTA,
    });
    expect(exhausted.allowed).toBe(false);
    expect(exhausted.reason).toBe('pro_required');
  });

  it('pro üye sınırsız', () => {
    const decision = evaluatePackAccess({
      packId: 'social-launch',
      isAuthenticated: true,
      isPro: true,
      usedProPackRuns: 99,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('pro_member');
  });

  it('tüm paketler için map üretir', () => {
    const map = evaluateAllPackAccess({
      isPro: false,
      isAuthenticated: true,
      usedProPackRuns: 0,
    });
    expect(map['content-studio'].allowed).toBe(true);
    expect(map['sales-outreach'].allowed).toBe(true);
  });
});
