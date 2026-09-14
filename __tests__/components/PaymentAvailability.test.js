import { render, screen } from '@testing-library/react';
import { toast } from 'react-hot-toast';
import { ProUpgradeForm } from '@/components/ProUpgradeForm';
import { PromoteToolButton } from '@/components/PromoteToolButton';
import tr from '../../messages/tr.json';
import en from '../../messages/en.json';
import PricingPage from '@/app/[locale]/uyelik/page';
import { createClient } from '@/utils/supabase/server';

let mockLocale = 'tr';
let mockMessages = tr;
jest.mock('next-intl', () => ({
  useLocale: () => mockLocale,
  useTranslations: (namespace) => (key) => mockMessages[namespace][key],
}));
jest.mock('next-intl/server', () => ({
  getTranslations:
    async ({ namespace }) =>
    (key) =>
      mockMessages[namespace][key],
}));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }));

jest.mock('@/app/actions', () => ({ createCheckoutSession: jest.fn() }));
jest.mock('@/app/actions/payment', () => ({ createPromotionCheckout: jest.fn() }));
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('promoted=success'),
}));
jest.mock('react-hot-toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

function localizedRender(component, locale, messages) {
  mockLocale = locale;
  mockMessages = messages;
  return render(component);
}

describe.each([
  ['tr', tr],
  ['en', en],
])('paused payment UI (%s)', (locale, messages) => {
  beforeEach(() => jest.clearAllMocks());

  it.each([true, false])('shows information instead of checkout for loggedIn=%s', (isLoggedIn) => {
    const { container } = localizedRender(
      <ProUpgradeForm priceId="price_test" unitAmount={1000} isLoggedIn={isLoggedIn} />,
      locale,
      messages
    );
    expect(screen.getByRole('status')).toHaveTextContent(messages.Payments.title);
    expect(container.querySelector('form')).toBeNull();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows sponsorship notice without a purchase button or misleading success toast', () => {
    localizedRender(<PromoteToolButton toolId="tool-id" toolSlug="tool" />, locale, messages);
    expect(screen.getByRole('status')).toHaveTextContent(messages.Payments.promotionTitle);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows the membership notice without loading Stripe products or offering payment', async () => {
    mockLocale = locale;
    mockMessages = messages;
    const from = jest.fn();
    createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
      from,
    });
    const page = await PricingPage({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve({ success: '1' }),
    });
    const { container } = render(page);
    expect(screen.getByRole('status')).toHaveTextContent(messages.Payments.title);
    expect(screen.getByText(messages.Payments.proTitle)).toBeVisible();
    expect(screen.getByText(messages.Payments.faqQ)).toBeVisible();
    expect(screen.queryByText(messages.MembershipPage.trustInstant)).not.toBeInTheDocument();
    expect(container.querySelector('form')).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
});
