const {
  buildPackPaywall,
  listFreeRunnablePackIds,
  FREE_PRO_PACK_QUOTA,
  evaluatePackAccess,
} = require('../../src/lib/kasif/packAccess');

describe('packAccess paywall UX', () => {
  it('ücretsiz runnable paket id listesi dolu', () => {
    const free = listFreeRunnablePackIds();
    expect(free.length).toBeGreaterThanOrEqual(3);
    expect(free).toEqual(expect.arrayContaining(['seo-brief', 'support-kit', 'pitch-deck']));
    expect(free).not.toContain('content-studio');
  });

  it('login_required login path + free runner secondary', () => {
    const wall = buildPackPaywall('tr', 'login_required');
    expect(wall.ctaHref).toMatch(/\/login\?next=/);
    expect(wall.secondaryHref).toMatch(/pack=/);
    expect(wall.secondaryHref).toMatch(/runner=1/);
    expect(wall.freePackIds.length).toBeGreaterThan(0);
  });

  it('pro_required üyelik path', () => {
    const wall = buildPackPaywall('en', 'pro_required');
    expect(wall.ctaHref).toBe('/en/uyelik');
    expect(wall.secondaryHref).toMatch(/^\/en\/kasif\?pack=/);
  });

  it('guest Pro pack kilitlenir', () => {
    const decision = evaluatePackAccess({
      packId: 'content-studio',
      isAuthenticated: false,
      isPro: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('login_required');
    expect(decision.freeRunsLeft).toBe(FREE_PRO_PACK_QUOTA);
  });
});
