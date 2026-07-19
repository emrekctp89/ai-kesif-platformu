/**
 * @jest-environment node
 */

describe('serverLogger', () => {
  it('redacts sensitive keys and forwards to logger', async () => {
    jest.resetModules();
    const errorMock = jest.fn();
    jest.doMock('../logger', () => ({
      __esModule: true,
      default: { error: errorMock, warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
    }));

    const { logServerError } = await import('../serverLogger');
    const err = new Error('stripe failed');
    err.digest = 'abc123';

    logServerError('billing', err, {
      email: 'user@example.com',
      plan: 'pro',
      token: 'secret-value',
    });

    expect(errorMock).toHaveBeenCalled();
    const [, meta, context] = errorMock.mock.calls[0];
    expect(context).toBe('billing');
    expect(meta.details).toEqual({
      email: '[redacted]',
      plan: 'pro',
      token: '[redacted]',
    });
    expect(meta.digest).toBe('abc123');
  });
});
