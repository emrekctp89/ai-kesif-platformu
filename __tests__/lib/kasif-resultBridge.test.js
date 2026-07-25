const {
  estimateMinutesFromFunnel,
  fingerprintArtifact,
  resolveBridgeGoal,
  validateBridgeArtifact,
} = require('../../src/lib/kasif/resultBridge');

describe('resultBridge', () => {
  it('desteklenen goal’ları çözer', () => {
    expect(resolveBridgeGoal(['logo-design', 'email-writing'])).toBe('email-writing');
    expect(resolveBridgeGoal(['image-generation'])).toBeNull();
  });

  it('e-posta çıktısını kabul eder', () => {
    const text = `Konu: Demo daveti

Merhaba Ayşe,
Ürünümüzü 15 dakikada göstermek isteriz.
Saygılarımla`;
    const result = validateBridgeArtifact('email-writing', text);
    expect(result.ok).toBe(true);
    expect(result.charCount).toBeGreaterThan(80);
    expect(result.fingerprint).toMatch(/^fnv1a_/);
    expect(result.preview.length).toBeLessThanOrEqual(240);
  });

  it('çok kısa e-postayı reddeder', () => {
    expect(validateBridgeArtifact('email-writing', 'Merhaba').ok).toBe(false);
    expect(validateBridgeArtifact('email-writing', 'Merhaba').reason).toBe('too_short');
  });

  it('içerik taslağını yapı veya uzunlukla kabul eder', () => {
    const weak = 'a'.repeat(250);
    expect(validateBridgeArtifact('content-writing', weak).ok).toBe(false);

    const solid = `# Başlık

Giriş paragrafı burada.

## Bölüm
${'Metin '.repeat(40)}`;
    expect(validateBridgeArtifact('content-writing', solid).ok).toBe(true);
  });

  it('fingerprint kararlıdır', () => {
    expect(fingerprintArtifact('abc')).toBe(fingerprintArtifact('abc'));
    expect(fingerprintArtifact('abc')).not.toBe(fingerprintArtifact('abcd'));
  });

  it('funnel zamanından dakika tahmin eder', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const minutes = estimateMinutesFromFunnel({
      stages: { setup_started: tenMinAgo },
    });
    expect(minutes).toBeGreaterThanOrEqual(9);
    expect(minutes).toBeLessThanOrEqual(12);
  });
});
