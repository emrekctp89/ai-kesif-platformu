import { render, screen } from '@testing-library/react';
import SubmitForm from '@/components/SubmitForm';

jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: (namespace) => (key) =>
    namespace === 'Pricing'
      ? ({ free: 'Free', freemium: 'Freemium', subscription: 'Subscription', oneTime: 'One-time' })[
          key
        ] || key
      : namespace === 'Homepage' && key === 'platformChromeExt'
        ? 'Chrome extension'
        : key,
}));
jest.mock('@/app/actions', () => ({ submitTool: jest.fn() }));

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

it('shows English pricing choices while submitting canonical pricing values', () => {
  render(<SubmitForm categories={[]} user={{ id: 'test-user' }} />);

  const pricing = screen.getByLabelText('pricingLabel');
  expect(pricing).toHaveDisplayValue('pricingPlaceholder');
  expect(screen.getByRole('option', { name: 'Free' })).toHaveValue('Ücretsiz');
  expect(screen.getByRole('option', { name: 'Freemium' })).toHaveValue('Freemium');
  expect(screen.getByRole('option', { name: 'Subscription' })).toHaveValue('Abonelik');
  expect(screen.getByRole('option', { name: 'One-time' })).toHaveValue('Tek Seferlik Ödeme');
  expect(screen.getByLabelText('Chrome extension')).toHaveAttribute('value', 'Chrome Uzantısı');
});
