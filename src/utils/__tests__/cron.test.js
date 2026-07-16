import { getBooleanParam, getIntegerParam, isCronAuthorized } from '@/utils/cron';

function createRequest({ authorization, secretParam } = {}) {
  const url = new URL('https://example.com/api/cron/test');
  if (secretParam) url.searchParams.set('secret', secretParam);

  return {
    url: url.toString(),
    headers: {
      get(name) {
        if (name.toLowerCase() === 'authorization') {
          return authorization || null;
        }
        return null;
      },
    },
  };
}

describe('cron helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('authorizes matching bearer tokens', () => {
    process.env.CRON_SECRET = 'secret-value';

    expect(isCronAuthorized(createRequest({ authorization: 'Bearer secret-value' }))).toBe(true);
  });

  it('only accepts query secrets when explicitly enabled', () => {
    process.env.CRON_SECRET = 'secret-value';
    const request = createRequest({ secretParam: 'secret-value' });

    expect(isCronAuthorized(request)).toBe(false);
    expect(isCronAuthorized(request, { allowQuerySecret: true })).toBe(true);
  });

  it('does not allow missing secrets in production', () => {
    delete process.env.CRON_SECRET;
    process.env.NODE_ENV = 'production';

    expect(isCronAuthorized(createRequest())).toBe(false);
  });

  it('parses integer and boolean search params consistently', () => {
    const params = new URLSearchParams({
      limit: '12',
      badLimit: 'abc',
      dryRun: 'yes',
    });

    expect(getIntegerParam(params, 'limit')).toBe(12);
    expect(getIntegerParam(params, 'badLimit')).toBeUndefined();
    expect(getIntegerParam(params, 'missing')).toBeUndefined();
    expect(getBooleanParam(params, 'dryRun')).toBe(true);
    expect(getBooleanParam(params, 'missing', true)).toBe(true);
  });
});
