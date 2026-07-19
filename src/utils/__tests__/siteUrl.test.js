/**
 * @jest-environment node
 */

describe('siteUrl helpers', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('uses localhost in development', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NEXT_PUBLIC_SITE_URL: 'https://should-not-use.example',
    };
    const { getSiteOrigin } = await import('../siteUrl');
    expect(getSiteOrigin()).toBe('http://localhost:3005');
  });

  it('prefers NEXT_PUBLIC_SITE_URL in production', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://www.example.com/',
      VERCEL_URL: 'preview.vercel.app',
    };
    const { getSiteOrigin } = await import('../siteUrl');
    expect(getSiteOrigin()).toBe('https://www.example.com');
  });

  it('marks cookies secure only in production', async () => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    let mod = await import('../siteUrl');
    expect(mod.getSupabaseCookieOptions().secure).toBe(true);

    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'development' };
    mod = await import('../siteUrl');
    expect(mod.getSupabaseCookieOptions().secure).toBe(false);
  });
});
