import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { JobPacksStrip } from '@/components/kasif/JobPacksStrip';

jest.mock('next-intl', () => ({ useTranslations: () => (key) => key }));
jest.mock('@/utils/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@/components/kasif/PackRunnerPanel', () => ({
  PackRunnerPanel: () => <p>Runner content</p>,
}));
jest.mock('@/lib/kasif/jobPacks', () => ({
  listJobPacks: () => [
    {
      id: 'demo',
      title: 'Demo pack',
      summary: 'Summary',
      stepLabels: ['Brief', 'Draft', 'Review', 'Publish'],
    },
  ],
  isRunnablePack: () => true,
  buildPackWorkmindUrl: () => '/workmind',
}));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
  Element.prototype.scrollIntoView = jest.fn();
});

it('shows the final step of the pack', () => {
  render(<JobPacksStrip />);
  expect(screen.getByText('4. Publish')).toBeInTheDocument();
});

it('opens and scrolls to the runner, then closes it and restores focus', () => {
  jest.useFakeTimers();
  try {
    render(<JobPacksStrip />);
    const trigger = screen.getByRole('button', { name: 'packs.runnerOpen' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Runner content')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(120));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'packs.runnerClose' }).at(-1));
    expect(screen.queryByText('Runner content')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  } finally {
    jest.useRealTimers();
  }
});

it('matches words across title and steps, and clears an empty search result', () => {
  render(<JobPacksStrip />);
  const search = screen.getByRole('searchbox', { name: 'packs.searchLabel' });
  fireEvent.change(search, { target: { value: 'publish demo' } });
  expect(screen.getByText('Demo pack')).toBeInTheDocument();
  fireEvent.change(search, { target: { value: 'no matching pack' } });
  expect(screen.queryByText('Demo pack')).not.toBeInTheDocument();
  expect(screen.getByText('packs.noSearchResults')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'packs.clearSearch' }));
  expect(screen.getByText('Demo pack')).toBeInTheDocument();
  expect(search).toHaveFocus();
});
