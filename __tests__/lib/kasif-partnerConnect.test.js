const {
  buildPartnerConnectSteps,
  describeRunnerProvider,
} = require('../../src/lib/kasif/partnerConnect');
const {
  formatRunnerSourceLabel,
  partnerRunnerStatus,
} = require('../../src/lib/kasif/partnerRunner');

describe('partnerConnect', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  it('pack runner sonrası 3 bağlama adımı üretir', () => {
    const steps = buildPartnerConnectSteps('content-studio', 'tr', {
      interactionId: 'int-1',
      feedbackToken: 'tok-1',
    });
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.id)).toEqual(['pick-tool', 'connect-account', 'paste-or-plan']);
    expect(steps[0].href).toMatch(/\/kasif\?q=/);
    expect(steps[1].href).toMatch(/\/kesfet/);
    expect(steps[2].href).toMatch(/workmind/);
    expect(steps[2].href).toContain('interactionId=int-1');
  });

  it('İngilizce locale ve prefix kullanır', () => {
    const steps = buildPartnerConnectSteps('sales-outreach', 'en');
    expect(steps[0].href).toMatch(/^\/en\/kasif/);
    expect(steps[0].title).toMatch(/Pick a catalog tool/i);
    expect(steps[1].description).toMatch(/Google\/GitHub|token/i);
  });

  it('provider açıklaması preferredSource’a göre değişir', () => {
    expect(describeRunnerProvider({ preferredSource: 'partner' }, 'tr').level).toBe('partner');
    expect(describeRunnerProvider({ preferredSource: 'deepseek' }, 'tr').level).toBe('deepseek');
    expect(describeRunnerProvider({ preferredSource: 'gemini' }, 'en').label).toMatch(/Gemini/i);
    expect(describeRunnerProvider({ preferredSource: 'local' }, 'tr').level).toBe('local');
  });

  it('partnerRunnerStatus preferredSource ve chain üretir', () => {
    delete process.env.KASIF_PARTNER_API_URL;
    delete process.env.KASIF_PARTNER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const localOnly = partnerRunnerStatus();
    expect(localOnly.preferredSource).toBe('local');
    expect(localOnly.chain).toEqual(['local']);
    expect(localOnly.qualityMode).toBe('local');

    process.env.GEMINI_API_KEY = 'g';
    const gem = partnerRunnerStatus();
    expect(gem.preferredSource).toBe('gemini');
    expect(gem.chain).toEqual(['gemini', 'local']);

    process.env.KASIF_PARTNER_API_URL = 'https://api.example.com/v1';
    process.env.KASIF_PARTNER_API_KEY = 'k';
    const partner = partnerRunnerStatus();
    expect(partner.preferredSource).toBe('partner');
    expect(partner.chain).toEqual(['partner', 'gemini', 'local']);
    expect(partner.qualityMode).toBe('cloud');
  });

  it('formatRunnerSourceLabel lokalize eder', () => {
    expect(formatRunnerSourceLabel('partner', 'en')).toMatch(/Partner/i);
    expect(formatRunnerSourceLabel('local-fallback', 'tr')).toMatch(/Yerel/i);
  });
});
