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
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_MODEL;
    delete process.env.GEMINI_API_KEY;
    global.fetch = undefined;
    jest.restoreAllMocks();
  });

  it('yapılandırılmamışken configured=false döner', () => {
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.XAI_API_KEY;
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
    expect(config.via).toBe('kasif_partner');

    const status = partnerRunnerStatus();
    expect(status.configured).toBe(true);
    expect(status.model).toBe('gpt-test');
    expect(status.baseUrlHost).toBe('api.example.com');
    expect(status.hasGeminiFallback).toBe(true);
    expect(status.via).toBe('kasif_partner');
    expect(JSON.stringify(status)).not.toContain('secret-key');
  });

  it('OPENAI_API_KEY ile otomatik partner yapılandırması', () => {
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.XAI_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-openai-test-key';
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
    process.env.GEMINI_API_KEY = 'gem';
    const { isPartnerRunnerConfigured, getPartnerRunnerConfig, partnerRunnerStatus } =
      loadPartner();
    expect(isPartnerRunnerConfigured()).toBe(true);
    expect(getPartnerRunnerConfig()).toMatchObject({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-openai-test-key',
      model: 'gpt-4o-mini',
      via: 'openai',
    });
    expect(partnerRunnerStatus()).toMatchObject({
      configured: true,
      preferredSource: 'partner',
      baseUrlHost: 'api.openai.com',
      chain: ['partner', 'gemini', 'local'],
    });
  });

  it('DEEPSEEK_API_KEY ile güncel OpenAI-compatible DeepSeek yapılandırması', async () => {
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.XAI_API_KEY;
    process.env.DEEPSEEK_API_KEY = 'ds-test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'DeepSeek yanıtı' } }] }),
    });

    const { getPartnerRunnerConfig, partnerRunnerStatus, callLlmText } = loadPartner();
    expect(getPartnerRunnerConfig()).toMatchObject({
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
      via: 'deepseek',
    });
    expect(partnerRunnerStatus()).toMatchObject({
      preferredSource: 'deepseek',
      chain: ['deepseek', 'local'],
      baseUrlHost: 'api.deepseek.com',
    });
    await expect(callLlmText('Merhaba')).resolves.toEqual({
      text: 'DeepSeek yanıtı',
      source: 'deepseek',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('XAI_API_KEY ile xAI partner yapılandırması', () => {
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.XAI_API_KEY = 'xai-test-key';
    const { getPartnerRunnerConfig } = loadPartner();
    expect(getPartnerRunnerConfig()).toMatchObject({
      baseUrl: 'https://api.x.ai/v1',
      model: 'grok-2-latest',
      via: 'xai',
    });
  });

  it('placeholder OPENAI anahtarını partner saymaz', () => {
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.XAI_API_KEY;
    process.env.OPENAI_API_KEY = 'your_openai_api_key_here';
    const { isPartnerRunnerConfigured } = loadPartner();
    expect(isPartnerRunnerConfigured()).toBe(false);
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

  it('callLlmText partner metnini döner; json formatı istemez', async () => {
    process.env.KASIF_PARTNER_API_URL = 'https://api.example.com/v1';
    process.env.KASIF_PARTNER_API_KEY = 'k';
    process.env.GEMINI_API_KEY = 'g';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '  Kâşif başlık önerisi  ' } }],
      }),
    });
    const { callLlmText } = loadPartner();
    const result = await callLlmText('başlık yaz', { system: 'Kâşif asistan' });
    expect(result).toEqual({ text: 'Kâşif başlık önerisi', source: 'partner' });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.response_format).toBeUndefined();
    expect(body.messages[0].content).toContain('Kâşif');
  });

  it('callLlmText partner fail olursa Gemini metnine düşer', async () => {
    process.env.KASIF_PARTNER_API_URL = 'https://api.example.com/v1';
    process.env.KASIF_PARTNER_API_KEY = 'k';
    process.env.GEMINI_API_KEY = 'g';
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Gemini metin çıktısı' }] } }],
        }),
      });
    const { callLlmText } = loadPartner();
    await expect(callLlmText('özet yaz')).resolves.toEqual({
      text: 'Gemini metin çıktısı',
      source: 'gemini',
    });
  });
});
