const {
  evaluateAllPackAccess,
  evaluatePackAccess,
  FREE_PRO_PACK_QUOTA,
} = require('../../src/lib/kasif/packAccess');
describe('PRO pack access', () => {
  test('all packs require PRO even with unused former trial quota', () => {
    expect(FREE_PRO_PACK_QUOTA).toBe(0);
    for (const access of Object.values(
      evaluateAllPackAccess({ isAuthenticated: true, usedProPackRuns: 0 })
    )) {
      expect(access.allowed).toBe(false);
      expect(access.reason).toBe('pro_required');
    }
  });
  test('guests cannot run any pack', () => {
    for (const access of Object.values(evaluateAllPackAccess({})))
      expect(access.reason).toBe('login_required');
  });
  test('PRO members can run all packs', () => {
    for (const access of Object.values(
      evaluateAllPackAccess({ isPro: true, isAuthenticated: true })
    ))
      expect(access.allowed).toBe(true);
  });
  test('unknown packs remain blocked for PRO members', () => {
    expect(evaluatePackAccess({ packId: 'unknown', isPro: true }).allowed).toBe(false);
  });
});
