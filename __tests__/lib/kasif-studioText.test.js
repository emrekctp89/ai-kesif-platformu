/**
 * @jest-environment node
 */

const originalEnv = { ...process.env };

function loadStudio() {
  jest.resetModules();
  return require('../../src/lib/kasif/studioText');
}

describe('kasif studioText', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    global.fetch = undefined;
    jest.restoreAllMocks();
  });

  it('buildLocalStudioText iskelet üretir', () => {
    const { buildLocalStudioText } = loadStudio();
    const text = buildLocalStudioText('SEO blog girişi');
    expect(text).toMatch(/SEO blog/);
    expect(text).toMatch(/## /);
    expect(text.length).toBeGreaterThan(80);
  });

  it('generateStudioText provider yoksa local döner', async () => {
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const { generateStudioText } = loadStudio();
    const result = await generateStudioText('Küçük ekipler için e-posta şablonu');
    expect(result.source).toBe('local');
    expect(result.text.length).toBeGreaterThan(40);
  });

  it('generateStudioText partner metnini kullanır', async () => {
    process.env.KASIF_PARTNER_API_URL = 'https://api.example.com/v1';
    process.env.KASIF_PARTNER_API_KEY = 'k';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Bu bir stüdyo partner çıktısıdır. En az kırk karakterlik anlamlı metin.',
            },
          },
        ],
      }),
    });
    const { generateStudioText } = loadStudio();
    const result = await generateStudioText('Blog girişi yaz');
    expect(result.source).toBe('partner');
    expect(result.text).toMatch(/stüdyo partner/i);
  });
});
