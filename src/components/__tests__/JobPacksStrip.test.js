import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JobPacksStrip } from '@/components/kasif/JobPacksStrip';

jest.mock('next-intl', () => ({ useTranslations: () => (key) => key }));
jest.mock('@/utils/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@/components/kasif/PackRunnerPanel', () => ({
  PackRunnerPanel: ({ onComplete }) => (
    <div>
      <p>Runner content</p>
      <button onClick={() => onComplete?.({ run: {} })}>Complete run</button>
    </div>
  ),
}));
jest.mock('@/lib/kasif/jobPacks', () => ({
  JOB_PACKS: [
    { id: 'demo', proHint: true },
    { id: 'seo-brief', proHint: false },
  ],
  RUNNABLE_PACK_IDS: ['demo', 'seo-brief'],
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
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ isPro: true, packs: { demo: { allowed: true } } }),
  });
  Element.prototype.scrollIntoView = jest.fn();
});

it('shows the final step of the pack', () => {
  render(<JobPacksStrip />);
  expect(screen.getByText('4. Publish')).toBeInTheDocument();
});

it('opens and scrolls to the runner, then closes it and restores focus', async () => {
  jest.useFakeTimers();
  try {
    render(<JobPacksStrip />);
    const trigger = await screen.findByRole('button', { name: 'packs.runnerOpen' });
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

it('refreshes access after completion while keeping the last output visible', async () => {
  let reads = 0;
  global.fetch = jest.fn(async () => {
    reads += 1;
    return {
      ok: true,
      json: async () => ({
        isPro: false,
        isAuthenticated: true,
        freeRunsLeft: reads === 1 ? 1 : 0,
        packs: { demo: { allowed: reads === 1, reason: 'pro_required' } },
      }),
    };
  });
  render(<JobPacksStrip />);
  await waitFor(() => expect(screen.getByText('packs.quotaHint')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'packs.runnerOpen' }));
  fireEvent.click(screen.getByRole('button', { name: 'Complete run' }));
  await screen.findByText('packs.quotaEmptyHint');
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Runner content')).toBeInTheDocument();
  expect(screen.queryByText('packs.quotaHint')).not.toBeInTheDocument();
});
