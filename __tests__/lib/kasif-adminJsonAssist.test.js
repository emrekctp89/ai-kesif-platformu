/**
 * @jest-environment node
 */

const originalEnv = { ...process.env };

function load() {
  jest.resetModules();
  return require('../../src/lib/kasif/adminJsonAssist');
}

describe('kasif adminJsonAssist', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    global.fetch = undefined;
    jest.restoreAllMocks();
  });

  it('buildLocalChallengeIdea title+description üretir', () => {
    const { buildLocalChallengeIdea } = load();
    const data = buildLocalChallengeIdea('logo tasarımı');
    expect(data.title).toMatch(/logo|Logo|Challenge/i);
    expect(data.description.length).toBeGreaterThan(20);
  });

  it('generateChallengeIdeaWithKasif provider yoksa local', async () => {
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const { generateChallengeIdeaWithKasif } = load();
    const result = await generateChallengeIdeaWithKasif('3D karakter');
    expect(result.source).toBe('local');
    expect(result.data.title.length).toBeGreaterThan(3);
  });

  it('generateChallengeIdeaWithKasif partner JSON kullanır', async () => {
    process.env.KASIF_PARTNER_API_URL = 'https://api.example.com/v1';
    process.env.KASIF_PARTNER_API_KEY = 'k';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'Neon Logo Haftası',
                description:
                  '7 günde tek bir neon logo teslimi üret; en yaratıcı ve uygulanabilir tasarımlar öne çıksın.',
              }),
            },
          },
        ],
      }),
    });
    const { generateChallengeIdeaWithKasif } = load();
    const result = await generateChallengeIdeaWithKasif('logo');
    expect(result.source).toBe('partner');
    expect(result.data.title).toMatch(/Neon/);
  });

  it('buildLocalCoPilotResponse snapshot sayıları içerir', () => {
    const { buildLocalCoPilotResponse } = load();
    const data = buildLocalCoPilotResponse({
      userPrompt: 'rate limit nasıl?',
      totals: { total_users: 12, total_tools: 34 },
    });
    expect(data.response_title).toMatch(/Kâşif|Kasif|yerel/i);
    expect(data.response_text).toMatch(/12|34/);
  });

  it('generateProjectStrategyWithKasif local yapı döner', async () => {
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const { generateProjectStrategyWithKasif } = load();
    const result = await generateProjectStrategyWithKasif({
      formattedData: 'Proje: Demo\nAraçlar: ChatGPT',
      title: 'Demo',
      toolNames: ['ChatGPT'],
    });
    expect(result.source).toBe('local');
    expect(result.data.strategic_suggestions.length).toBeGreaterThanOrEqual(2);
    expect(result.data.potential_tools.length).toBeGreaterThanOrEqual(1);
  });
});
