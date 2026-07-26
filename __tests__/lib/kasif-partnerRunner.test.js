/**
 * @jest-environment node
 */

const originalEnv = { ...process.env };

function loadPartner() {
  jest.resetModules();
  return require('../../src/lib/kasif/partnerRunner');
}

describe('partnerRunner', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.KASIF_PARTNER_MODEL;
    delete process.env.GEMINI_API_KEY;
    global.fetch = undefined;
    jest.restoreAllMocks();
  });

  it('yapılandırılmamışken configured=false döner', () => {
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const { isPartnerRunnerConfigured, partnerRunnerStatus, getPartnerRunnerConfig } =
      loadPartner();
    expect(isPartnerRunnerConfigured()).toBe(false);
    expect(getPartnerRunnerConfig()).toBeNull();
    expect(partnerRunnerStatus()).toMatchObject({
      configured: false,
      model: null,
      baseUrlHost: null,
      preferredSource: 'local',
      chain: ['local'],
      qualityMode: 'local',
    });
  });

  it('env ile yapılandırma ve status host üretir (key sızdırmaz)', () => {
    process.env.KASIF_PARTNER_API_URL = 'https://api.example.com/v1/';
    process.env.KASIF_PARTNER_API_KEY = 'secret-key-xyz';
    process.env.KASIF_PARTNER_MODEL = 'gpt-test';
    process.env.GEMINI_API_KEY = 'gem-key';
    const { isPartnerRunnerConfigured, getPartnerRunnerConfig, partnerRunnerStatus } =
      loadPartner();
    expect(isPartnerRunnerConfigured()).toBe(true);
    const config = getPartnerRunnerConfig();
    expect(config.baseUrl).toBe('https://api.example.com/v1');
    expect(config.model).toBe('gpt-test');
    expect(config.apiKey).toBe('secret-key-xyz');

    const status = partnerRunnerStatus();
    expect(status.configured).toBe(true);
    expect(status.model).toBe('gpt-test');
    expect(status.baseUrlHost).toBe('api.example.com');
    expect(status.hasGeminiFallback).toBe(true);
    expect(JSON.stringify(status)).not.toContain('secret-key');
  });

  it('callPartnerChatJson JSON parse eder', async () => {
    process.env.KASIF_PARTNER_API_URL = 'https://api.example.com/v1';
    process.env.KASIF_PARTNER_API_KEY = 'k';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"draft":"hello world pack content"}' } }],
      }),
    });
    const { callPartnerChatJson } = loadPartner();
    const data = await callPartnerChatJson('write a draft');
    expect(data).toEqual({ draft: 'hello world pack content' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer k' }),
      })
    );
  });

  it('callLlmJson partner öncelikli; başarısızsa Gemini', async () => {
    process.env.KASIF_PARTNER_API_URL = 'https://api.example.com/v1';
    process.env.KASIF_PARTNER_API_KEY = 'k';
    process.env.GEMINI_API_KEY = 'g';

    global.fetch = jest
      .fn()
      // partner fail
      .mockResolvedValueOnce({ ok: false, status: 500 })
      // gemini ok
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok":true,"via":"gemini"}' }] } }],
        }),
      });

    const { callLlmJson } = loadPartner();
    const result = await callLlmJson('prompt');
    expect(result).toEqual({ data: { ok: true, via: 'gemini' }, source: 'gemini' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('callLlmJson partner başarılıysa gemini çağırmaz', async () => {
    process.env.KASIF_PARTNER_API_URL = 'https://api.example.com/v1';
    process.env.KASIF_PARTNER_API_KEY = 'k';
    process.env.GEMINI_API_KEY = 'g';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"via":"partner"}' } }],
      }),
    });

    const { callLlmJson } = loadPartner();
    const result = await callLlmJson('prompt');
    expect(result).toEqual({ data: { via: 'partner' }, source: 'partner' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('hiç provider yoksa null döner', async () => {
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const { callLlmJson } = loadPartner();
    await expect(callLlmJson('x')).resolves.toEqual({ data: null, source: null });
  });
});
