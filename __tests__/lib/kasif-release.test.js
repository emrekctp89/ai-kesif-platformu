import { KASIF_CAPABILITIES, KASIF_VERSION, buildKasifRuntimeStatus } from '@/lib/kasif/release';

describe('Kâşif v2.1 release manifest', () => {
  it('ücretli sağlayıcı olmadan çekirdek yetenekleri hazır gösterir', () => {
    const status = buildKasifRuntimeStatus({});
    expect(KASIF_VERSION).toBe('2.1.1');
    expect(status.mode).toBe('local-only');
    expect(status.readiness).toBe('ready');
    expect(status.guarantees.paidProviderRequired).toBe(false);
    expect(status.guarantees.automaticPublishing).toBe(false);
    expect(
      status.capabilities
        .filter((item) => item.tier === 'core')
        .every((item) => item.status === 'ready')
    ).toBe(true);
  });

  it('yalnız sağlayıcı varlığını bildirir ve gizli değerleri döndürmez', () => {
    const secret = 'do-not-expose-this-key';
    const status = buildKasifRuntimeStatus({
      GEMINI_API_KEY: secret,
      KASIF_PARTNER_API_URL: 'https://partner.example',
      KASIF_PARTNER_API_KEY: secret,
    });
    expect(status.mode).toBe('local-first-hybrid');
    expect(status.providers).toEqual({
      deepseek: false,
      gemini: true,
      embeddings: true,
      partner: true,
    });
    expect(JSON.stringify(status)).not.toContain(secret);
  });

  it('scraping kill switch durumunu capability seviyesinde gösterir', () => {
    const status = buildKasifRuntimeStatus({ KASIF_SCRAPE_ENABLED: 'false' });
    expect(status.capabilities.find((item) => item.id === 'scrape')?.status).toBe('disabled');
    expect(KASIF_CAPABILITIES.length).toBeGreaterThanOrEqual(10);
  });
});
