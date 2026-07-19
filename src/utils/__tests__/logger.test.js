describe('logger utility', () => {
  const originalEnv = process.env;
  let errorSpy;
  let warnSpy;
  let infoSpy;
  let logSpy;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'development', DEBUG: 'true' };
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
    logSpy.mockRestore();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('serializes Error instances with message and name', async () => {
    const { serializeError } = await import('../logger');
    const err = new Error('boom');
    err.code = 'E_TEST';

    expect(serializeError(err)).toMatchObject({
      name: 'Error',
      message: 'boom',
      code: 'E_TEST',
    });
  });

  it('normalizes console-style Error second args', async () => {
    const { normalizeLogData } = await import('../logger');
    const err = new Error('fail');

    expect(normalizeLogData(err)).toEqual({
      error: expect.objectContaining({ message: 'fail', name: 'Error' }),
    });
  });

  it('normalizes string and number second args', async () => {
    const { normalizeLogData } = await import('../logger');

    expect(normalizeLogData('hint')).toEqual({ detail: 'hint' });
    expect(normalizeLogData(42)).toEqual({ detail: 42 });
  });

  it('keeps structured objects and serializes nested errors', async () => {
    const { normalizeLogData } = await import('../logger');
    const err = new Error('nested');

    expect(normalizeLogData({ userId: 'u1', error: err })).toEqual({
      userId: 'u1',
      error: expect.objectContaining({ message: 'nested' }),
    });
  });

  it('redacts sensitive keys', async () => {
    const { sanitizeSensitiveData } = await import('../logger');

    expect(
      sanitizeSensitiveData({
        password: 'secret',
        apiKey: 'key-123',
        token: 'tok',
        userId: 'ok',
      })
    ).toEqual({
      password: '[REDACTED]',
      apiKey: '[REDACTED]',
      token: '[REDACTED]',
      userId: 'ok',
    });
  });

  it('logs Error second arg so details are not dropped (dev)', async () => {
    const { logger } = await import('../logger');
    const err = new Error('lost-before');

    logger.error('Something failed:', err);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [formatted, data] = errorSpy.mock.calls[0];
    expect(formatted).toContain('Something failed:');
    expect(data).toEqual({
      error: expect.objectContaining({ message: 'lost-before', name: 'Error' }),
    });
  });

  it('logs structured data in production as JSON', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    errorSpy.mockRestore();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { logger } = await import('../logger');
    logger.error('prod fail', new Error('prod-error'));

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(payload).toMatchObject({
      level: 'error',
      message: 'prod fail',
      data: {
        error: {
          name: 'Error',
          message: 'prod-error',
        },
      },
    });
    // stack omitted in production
    expect(payload.data.error.stack).toBeUndefined();
  });

  it('supports message-only calls', async () => {
    const { logger } = await import('../logger');
    logger.warn('just a warning');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('just a warning');
    expect(warnSpy.mock.calls[0][1]).toBeUndefined();
  });

  it('serializes supabase-style error objects', async () => {
    const { serializeError, normalizeLogData } = await import('../logger');
    const supabaseErr = {
      message: 'row not found',
      code: 'PGRST116',
      details: null,
      hint: null,
    };

    expect(serializeError(supabaseErr)).toMatchObject({
      message: 'row not found',
      code: 'PGRST116',
    });
    expect(normalizeLogData(supabaseErr)).toMatchObject({
      message: 'row not found',
      code: 'PGRST116',
    });
  });
});
