import { rateLimit } from '../rateLimit';

describe('rateLimit', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps separate limiter instances independent for the same token', async () => {
    const first = rateLimit({ interval: 60_000 });
    const second = rateLimit({ interval: 1_000 });
    await first.check(1, 'shared-user');
    expect((await first.check(1, 'shared-user')).success).toBe(false);
    expect((await second.check(1, 'shared-user')).success).toBe(true);
  });

  it('reports the same reset time throughout a fixed window', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(100_000);
    const limiter = rateLimit({ interval: 1_000 });
    expect((await limiter.check(2, 'user')).reset).toBe(101_000);
    now.mockReturnValue(100_500);
    expect(await limiter.check(2, 'user')).toMatchObject({ success: true, reset: 101_000 });
    expect(await limiter.check(2, 'user')).toMatchObject({ success: false, reset: 101_000 });
  });

  it('starts a new window at the exact expiration boundary', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(100_000);
    const limiter = rateLimit({ interval: 1_000 });
    await limiter.check(1, 'user');
    now.mockReturnValue(101_000);
    expect(await limiter.check(1, 'user')).toEqual({
      success: true,
      limit: 1,
      remaining: 0,
      reset: 102_000,
    });
  });

  it('limiti aşmayan isteklere izin verir', async () => {
    const limiter = rateLimit({ interval: 60_000 });
    const result = await limiter.check(5, 'user-1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('art arda istekleri sayar', async () => {
    const limiter = rateLimit({ interval: 60_000 });
    const token = 'user-counter-test';

    await limiter.check(5, token);
    await limiter.check(5, token);
    const result = await limiter.check(5, token);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('limiti aşan istekleri reddeder', async () => {
    const limiter = rateLimit({ interval: 60_000 });
    const token = 'user-over-limit';

    // 3 istek hakkı ver, 3 istek yap
    await limiter.check(3, token);
    await limiter.check(3, token);
    await limiter.check(3, token);

    // 4. istek reddedilmeli
    const result = await limiter.check(3, token);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('farklı tokenlar bağımsız çalışır', async () => {
    const limiter = rateLimit({ interval: 60_000 });

    // user-a limitini doldur
    await limiter.check(1, 'user-a');
    const blockedA = await limiter.check(1, 'user-a');
    expect(blockedA.success).toBe(false);

    // user-b hâlâ geçebilmeli
    const allowedB = await limiter.check(1, 'user-b');
    expect(allowedB.success).toBe(true);
  });

  it('reset bilgisini döndürür', async () => {
    const limiter = rateLimit({ interval: 60_000 });
    const result = await limiter.check(10, 'user-reset');
    expect(result.reset).toBeGreaterThan(Date.now());
  });
});
