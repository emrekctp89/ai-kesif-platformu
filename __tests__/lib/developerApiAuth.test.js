/**
 * @jest-environment node
 */

const { extractBearerToken, hashApiKey, API_KEY_PREFIX } = require('../../src/lib/developerApiAuth');

describe('developerApiAuth', () => {
  it('extractBearerToken geçerli aik_ token çıkarır', () => {
    const result = extractBearerToken('Bearer aik_testkey123');
    expect(result).toEqual({ token: 'aik_testkey123' });
  });

  it('eksik veya hatalı header reddeder', () => {
    expect(extractBearerToken(null).status).toBe(401);
    expect(extractBearerToken('Basic x').status).toBe(401);
    expect(extractBearerToken('Bearer ').status).toBe(401);
    expect(extractBearerToken('Bearer not_prefixed').status).toBe(401);
  });

  it('hashApiKey deterministik sha256 üretir', () => {
    const a = hashApiKey(`${API_KEY_PREFIX}abc`);
    const b = hashApiKey(`${API_KEY_PREFIX}abc`);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(hashApiKey(`${API_KEY_PREFIX}xyz`)).not.toBe(a);
  });
});
