import { formatPricing } from '../formatPricing';

describe('formatPricing', () => {
  const t = (key) =>
    ({
      free: 'Free',
      monthly: 'Monthly',
      yearly: 'Yearly',
      oneTime: 'One-time',
      credits: 'Credits',
      paid: 'Paid',
    })[key];

  it('returns null for empty input', () => {
    expect(formatPricing(null, t)).toBeNull();
    expect(formatPricing('', t)).toBeNull();
  });

  it('translates known Turkish pricing tokens', () => {
    expect(formatPricing('Ücretsiz', t)).toBe('Free');
    expect(formatPricing('Aylık $20', t)).toBe('Monthly $20');
    expect(formatPricing('Yıllık + Kredi', t)).toBe('Yearly + Credits');
  });
});
