/**
 * @jest-environment node
 */

const originalEnv = { ...process.env };

function loadAssist() {
  jest.resetModules();
  return require('../../src/lib/kasif/contentAssist');
}

describe('kasif contentAssist', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    global.fetch = undefined;
    jest.restoreAllMocks();
  });

  it('buildLocalContentAssist title en az 6 karakter ve spesifikleştirir', () => {
    const { buildLocalContentAssist } = loadAssist();
    const text = buildLocalContentAssist({
      mode: 'title',
      title: 'ChatGPT',
      content: 'Küçük ekipler için e-posta yazma iş akışı ve ilk çıktı.',
      locale: 'tr',
    });
    expect(text.length).toBeGreaterThanOrEqual(6);
    expect(text.length).toBeLessThanOrEqual(80);
    expect(text.toLocaleLowerCase('tr-TR')).toContain('chatgpt');
  });

  it('buildLocalContentAssist description SEO uzunluğunda üretir', () => {
    const { buildLocalContentAssist } = loadAssist();
    const text = buildLocalContentAssist({
      mode: 'description',
      title: 'Ücretsiz görsel araçları',
      content:
        'Bu rehber küçük ekiplerin kapak görseli üretmesini hızlandırır. İlk oturumda bir prompt seti ve kapak teslim edilir.',
      locale: 'tr',
    });
    expect(text.length).toBeGreaterThanOrEqual(24);
    expect(text.length).toBeLessThanOrEqual(180);
  });

  it('buildLocalContentAssist outline içerik tipine göre iskelet üretir', () => {
    const { buildLocalContentAssist } = loadAssist();
    const text = buildLocalContentAssist({
      mode: 'outline',
      title: 'Midjourney vs DALL-E karşılaştırması',
      content: '',
      locale: 'tr',
    });
    expect(text).toMatch(/## /);
    expect(text.toLocaleLowerCase('tr-TR')).toMatch(/karşılaştır|seçenek|ölçüt/);
  });

  it('buildLocalContentAssist improve başlık ekler ve boş satırları sadeleştirir', () => {
    const { buildLocalContentAssist } = loadAssist();
    const text = buildLocalContentAssist({
      mode: 'improve',
      title: 'Prompt mühendisliği',
      content: 'İlk cümle burası.\n\n\n\nİkinci paragraf burası ve daha uzun olmalı.',
      locale: 'tr',
    });
    expect(text.startsWith('# Prompt mühendisliği')).toBe(true);
    expect(text).not.toMatch(/\n{3,}/);
  });

  it('assistCreatorContent LLM yoksa local source döner', async () => {
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const { assistCreatorContent } = loadAssist();
    const result = await assistCreatorContent({
      mode: 'title',
      title: 'SEO için AI araçları',
      content: 'Başlık ve meta yazımını hızlandıran pratik bir rehber metni burada yeterince uzun.',
      locale: 'tr',
    });
    expect(result.source).toBe('local');
    expect(result.mode).toBe('title');
    expect(result.text.length).toBeGreaterThanOrEqual(6);
  });

  it('assistCreatorContent partner metnini tercih eder', async () => {
    process.env.KASIF_PARTNER_API_URL = 'https://api.example.com/v1';
    process.env.KASIF_PARTNER_API_KEY = 'k';
    process.env.GEMINI_API_KEY = 'g';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Küçük ekipler için pratik SEO başlık rehberi' } }],
      }),
    });
    const { assistCreatorContent } = loadAssist();
    const result = await assistCreatorContent({
      mode: 'title',
      title: 'SEO',
      content: 'Uzun bir içerik gövdesi burada; en az kırk karakter olmalı ki validasyon geçsin.',
      locale: 'tr',
    });
    expect(result.source).toBe('partner');
    expect(result.text).toMatch(/SEO|başlık|ekipler/i);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
