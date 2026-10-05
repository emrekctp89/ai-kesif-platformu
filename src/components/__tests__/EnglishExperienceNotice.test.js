import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { EnglishExperienceNotice } from '@/components/EnglishExperienceNotice';
let mockLocale = 'en';
jest.mock('next-intl', () => ({ useLocale: () => mockLocale }));
jest.mock('@/i18n/routing', () => ({
  usePathname: () => '/blog',
  Link: ({ locale: _locale, children, ...props }) => <a {...props}>{children}</a>,
}));

beforeEach(() => {
  mockLocale = 'en';
  sessionStorage.clear();
});

it('informs English visitors and keeps the Turkish destination on the same page', () => {
  render(<EnglishExperienceNotice />);
  expect(screen.getByRole('dialog')).toHaveAccessibleName(
    'Our English experience is still growing'
  );
  expect(screen.getByRole('button', { name: 'Continue in English' })).toHaveFocus();
  expect(screen.getByRole('link', { name: 'Explore in Turkish' })).toHaveAttribute('href', '/blog');
});

it('does not show the notice again in the same session after continuing', () => {
  const view = render(<EnglishExperienceNotice />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue in English' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  view.unmount();
  render(<EnglishExperienceNotice />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('never interrupts Turkish visitors', () => {
  mockLocale = 'tr';
  render(<EnglishExperienceNotice />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('can be dismissed with Escape', () => {
  render(<EnglishExperienceNotice />);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(sessionStorage.getItem('english-experience-notice-v1')).toBe('dismissed');
});
