import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { PackRunnerPanel } from '@/components/kasif/PackRunnerPanel';

jest.mock('next-intl', () => ({ useTranslations: () => (key) => key }));
jest.mock('@/utils/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@/components/kasif/ProPackOnboarding', () => ({ ProPackOnboarding: () => null }));
jest.mock('@/components/kasif/JobReceiptCard', () => ({ JobReceiptCard: () => null }));

beforeEach(() => {
  sessionStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
});

it('keeps separate drafts when switching between packs', () => {
  const view = render(<PackRunnerPanel packId="seo-brief" />);
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'SEO için ürün sayfası hazırla' },
  });
  view.rerender(<PackRunnerPanel packId="sales-outreach" />);
  expect(screen.getByRole('textbox')).toHaveValue('');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Satış e-postası hazırla' } });
  view.rerender(<PackRunnerPanel packId="seo-brief" />);
  expect(screen.getByRole('textbox')).toHaveValue('SEO için ürün sayfası hazırla');
  view.unmount();
  render(<PackRunnerPanel packId="sales-outreach" />);
  expect(screen.getByRole('textbox')).toHaveValue('Satış e-postası hazırla');
});

it('aborts the old request when the selected pack changes', () => {
  global.fetch = jest.fn((url) =>
    String(url).includes('pack-runner') ? new Promise(() => {}) : Promise.resolve({ ok: false })
  );
  const view = render(<PackRunnerPanel packId="seo-brief" defaultBrief="Ürün sayfası için SEO" />);
  fireEvent.submit(screen.getByRole('textbox').closest('form'));
  const request = global.fetch.mock.calls.find(([url]) => String(url).includes('pack-runner'));
  view.rerender(<PackRunnerPanel packId="sales-outreach" />);
  expect(request[1].signal.aborted).toBe(true);
  expect(screen.getByRole('textbox')).toBeEnabled();
});
