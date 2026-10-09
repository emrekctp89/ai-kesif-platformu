import { formatPricing } from '@/utils/formatPricing';

it('translates Turkish pricing model values into the active locale', () => {
  const translate = (key) =>
    ({
      free: 'Free',
      subscription: 'Subscription',
      oneTime: 'One-time',
    })[key];

  expect(formatPricing('Ücretsiz', translate)).toBe('Free');
  expect(formatPricing('Abonelik', translate)).toBe('Subscription');
  expect(formatPricing('Tek Seferlik Ödeme', translate)).toBe('One-time');
});
