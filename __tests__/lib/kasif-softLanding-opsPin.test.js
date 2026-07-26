const {
  getSoftLandingVariantConfig,
  pickSoftLandingVariant,
  resolveSoftLandingVariant,
  normalizeSoftLandingPinVariant,
  parseSoftLandingPinRow,
} = require('../../src/lib/kasif/softLanding');

describe('soft-landing ops pin priority', () => {
  it('normalizeSoftLandingPinVariant only accepts A/B', () => {
    expect(normalizeSoftLandingPinVariant('a')).toBe('A');
    expect(normalizeSoftLandingPinVariant('B')).toBe('B');
    expect(normalizeSoftLandingPinVariant('ab')).toBeNull();
    expect(normalizeSoftLandingPinVariant('')).toBeNull();
  });

  it('parseSoftLandingPinRow reads jsonb value', () => {
    const parsed = parseSoftLandingPinRow({
      value: { variant: 'B', note: 'winner' },
      updated_at: '2026-07-26T00:00:00.000Z',
    });
    expect(parsed.variant).toBe('B');
    expect(parsed.note).toBe('winner');
    expect(parsed.pinnedAt).toBe('2026-07-26T00:00:00.000Z');
  });

  it('env force beats ops pin', () => {
    const config = getSoftLandingVariantConfig({ force: 'A', opsPin: 'B', defaultVariant: 'ab' });
    expect(config.force).toBe('A');
    expect(config.opsPin).toBe('B');
    expect(config.mode).toBe('force_A');
    expect(pickSoftLandingVariant('seed', { force: 'A', opsPin: 'B' })).toBe('A');
  });

  it('ops pin beats sticky client and ab split', () => {
    const config = getSoftLandingVariantConfig({ opsPin: 'B', defaultVariant: 'ab' });
    expect(config.mode).toBe('ops_pin_B');
    expect(pickSoftLandingVariant('anything', { opsPin: 'B' })).toBe('B');
    expect(resolveSoftLandingVariant('A', 'seed', { opsPin: 'B' })).toBe('B');
  });

  it('without force/ops pin, client sticky wins on resolve', () => {
    expect(resolveSoftLandingVariant('A', 'seed', { defaultVariant: 'ab' })).toBe('A');
    expect(resolveSoftLandingVariant(null, 'seed-xyz', { defaultVariant: 'ab' })).toMatch(/^[AB]$/);
  });
});
