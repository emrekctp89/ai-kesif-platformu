import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PackRunnerPanel } from '@/components/kasif/PackRunnerPanel';

jest.mock('next-intl', () => ({
  useTranslations: () => (key) =>
    key === 'packs.runnerBriefPlaceholderSeo' ? 'Örn. KOBİ için SEO rehberi' : key,
}));
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

it('stops waiting without losing the brief and ignores a late response', async () => {
  let resolveRequest;
  global.fetch = jest.fn((url) =>
    String(url).includes('pack-runner')
      ? new Promise((resolve) => {
          resolveRequest = resolve;
        })
      : Promise.resolve({ ok: false })
  );
  render(<PackRunnerPanel packId="seo-brief" defaultBrief="Ürün sayfası için SEO" />);
  const brief = screen.getByRole('textbox');
  fireEvent.submit(brief.closest('form'));
  const request = global.fetch.mock.calls.find(([url]) => String(url).includes('pack-runner'));
  fireEvent.click(screen.getByRole('button', { name: 'stopRequest' }));
  expect(request[1].signal.aborted).toBe(true);
  expect(brief).toBeEnabled();
  expect(brief).toHaveValue('Ürün sayfası için SEO');
  expect(screen.getByText('packs.runnerStopped')).toBeInTheDocument();
  await act(async () =>
    resolveRequest({
      ok: true,
      json: async () => ({ run: { steps: [] }, artifactText: 'Late output' }),
    })
  );
  expect(screen.queryByText('Late output')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'packs.runnerCta' })).toBeEnabled();
});

it('copies only the selected step instead of the complete artifact', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  global.fetch = jest.fn((url) =>
    Promise.resolve(
      String(url).includes('pack-runner')
        ? {
            ok: true,
            json: async () => ({
              run: { steps: [{ id: 'intro', title: 'Başlık', body: 'Yalnızca bu adım' }] },
              artifactText: 'Bütün çıktının metni',
            }),
          }
        : { ok: false }
    )
  );
  render(<PackRunnerPanel packId="seo-brief" defaultBrief="Ürün sayfası için SEO" />);
  fireEvent.submit(screen.getByRole('textbox').closest('form'));
  fireEvent.click(await screen.findByRole('button', { name: 'packs.copyStep' }));
  expect(writeText).toHaveBeenCalledWith('Yalnızca bu adım');
  expect(await screen.findByRole('button', { name: 'answerCopied' })).toBeEnabled();
});

it('identifies the original brief and marks the output when the brief changes', async () => {
  global.fetch = jest.fn((url) =>
    Promise.resolve(
      String(url).includes('pack-runner')
        ? { ok: true, json: async () => ({ run: { steps: [] }, artifactText: 'SEO çıktısı' }) }
        : { ok: false }
    )
  );
  render(<PackRunnerPanel packId="seo-brief" defaultBrief="Ürün sayfası için SEO" />);
  const brief = screen.getByRole('textbox');
  fireEvent.submit(brief.closest('form'));
  await screen.findByText('packs.usedBrief');
  expect(screen.queryByText('packs.briefChanged')).not.toBeInTheDocument();
  fireEvent.change(brief, { target: { value: 'Yeni bir ürün için SEO' } });
  expect(screen.getByText('packs.briefChanged')).toBeInTheDocument();
  expect(screen.getByText('Ürün sayfası için SEO')).toBeInTheDocument();
  fireEvent.change(brief, { target: { value: 'Ürün sayfası için SEO' } });
  expect(screen.queryByText('packs.briefChanged')).not.toBeInTheDocument();
});

it('runs with Ctrl+Enter only after the brief is long enough', () => {
  global.fetch = jest.fn((url) =>
    String(url).includes('pack-runner') ? new Promise(() => {}) : Promise.resolve({ ok: false })
  );
  render(<PackRunnerPanel packId="seo-brief" />);
  const brief = screen.getByRole('textbox');
  fireEvent.change(brief, { target: { value: 'SEO' } });
  expect(screen.getByText('packs.briefRemaining')).toBeInTheDocument();
  fireEvent.keyDown(brief, { key: 'Enter', ctrlKey: true });
  expect(
    global.fetch.mock.calls.filter(([url]) => String(url).includes('pack-runner'))
  ).toHaveLength(0);
  fireEvent.change(brief, { target: { value: 'Ürün sayfası için SEO' } });
  fireEvent.keyDown(brief, { key: 'Enter' });
  expect(
    global.fetch.mock.calls.filter(([url]) => String(url).includes('pack-runner'))
  ).toHaveLength(0);
  fireEvent.keyDown(brief, { key: 'Enter', ctrlKey: true });
  expect(
    global.fetch.mock.calls.filter(([url]) => String(url).includes('pack-runner'))
  ).toHaveLength(1);
});

it.each([null, 'pro_required'])(
  'preserves usable output after a failed rerun (%s)',
  async (reason) => {
    let runs = 0;
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    global.fetch = jest.fn((url) => {
      if (!String(url).includes('pack-runner')) return Promise.resolve({ ok: false });
      runs += 1;
      return Promise.resolve(
        runs === 1
          ? {
              ok: true,
              json: async () => ({ run: { steps: [] }, artifactText: 'Önceki başarılı çıktı' }),
            }
          : {
              ok: false,
              json: async () => ({
                error: 'Yeniden çalıştırılamadı',
                reason,
                upgradePath: reason ? '/uyelik' : undefined,
              }),
            }
      );
    });
    render(<PackRunnerPanel packId="seo-brief" defaultBrief="Ürün sayfası için SEO" />);
    fireEvent.submit(screen.getByRole('textbox').closest('form'));
    await screen.findByText('Önceki başarılı çıktı');
    fireEvent.submit(screen.getByRole('textbox').closest('form'));
    await screen.findByText('Yeniden çalıştırılamadı');
    expect(screen.getByText('packs.previousOutputPreserved')).toBeInTheDocument();
    expect(screen.getByText('Önceki başarılı çıktı')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'packs.runnerCopy' }));
    expect(writeText).toHaveBeenCalledWith('Önceki başarılı çıktı');
    await screen.findByRole('button', { name: 'job.copied' });
  }
);

it('expands and collapses long step output', async () => {
  const body = 'Uzun adım metni. '.repeat(40);
  global.fetch = jest.fn((url) =>
    Promise.resolve(
      String(url).includes('pack-runner')
        ? {
            ok: true,
            json: async () => ({ run: { steps: [{ title: 'Taslak', body }] }, artifactText: body }),
          }
        : { ok: false }
    )
  );
  render(<PackRunnerPanel packId="seo-brief" defaultBrief="Ürün sayfası için SEO" />);
  fireEvent.submit(screen.getByRole('textbox').closest('form'));
  const expand = await screen.findByRole('button', { name: 'packs.expandStep' });
  expect(expand).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(expand);
  expect(screen.getByRole('button', { name: 'packs.collapseStep' })).toHaveAttribute(
    'aria-expanded',
    'true'
  );
  fireEvent.click(screen.getByRole('button', { name: 'packs.collapseStep' }));
  expect(screen.getByRole('button', { name: 'packs.expandStep' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
});

it('expands and collapses all long steps together', async () => {
  const body = 'Uzun metin. '.repeat(50);
  global.fetch = jest.fn((url) =>
    Promise.resolve(
      String(url).includes('pack-runner')
        ? {
            ok: true,
            json: async () => ({
              run: {
                steps: [
                  { title: 'Bir', body },
                  { title: 'İki', body },
                ],
              },
              artifactText: body,
            }),
          }
        : { ok: false }
    )
  );
  render(<PackRunnerPanel packId="seo-brief" defaultBrief="Ürün sayfası için SEO" />);
  fireEvent.submit(screen.getByRole('textbox').closest('form'));
  fireEvent.click(await screen.findByRole('button', { name: 'packs.expandAllSteps' }));
  expect(screen.getAllByRole('button', { name: 'packs.collapseStep' })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'packs.collapseAllSteps' }));
  expect(screen.getAllByRole('button', { name: 'packs.expandStep' })).toHaveLength(2);
});

it('fills an editable example without running or replacing an existing brief', () => {
  render(<PackRunnerPanel packId="seo-brief" />);
  fireEvent.click(screen.getByRole('button', { name: 'packs.useExampleBrief' }));
  const brief = screen.getByRole('textbox');
  expect(brief).toHaveValue('KOBİ için SEO rehberi');
  expect(brief).toHaveFocus();
  expect(sessionStorage.getItem('kasif-pack-brief-v1:tr:seo-brief')).toBe('KOBİ için SEO rehberi');
  expect(
    global.fetch.mock.calls.filter(([url]) => String(url).includes('pack-runner'))
  ).toHaveLength(0);
  expect(screen.queryByRole('button', { name: 'packs.useExampleBrief' })).not.toBeInTheDocument();
});

it('shows a slow-request hint and removes it when stopped', () => {
  jest.useFakeTimers();
  try {
    global.fetch = jest.fn((url) =>
      String(url).includes('pack-runner') ? new Promise(() => {}) : Promise.resolve({ ok: false })
    );
    render(<PackRunnerPanel packId="seo-brief" defaultBrief="Ürün sayfası için SEO" />);
    fireEvent.submit(screen.getByRole('textbox').closest('form'));
    expect(screen.getByText('packs.runnerWaitTime')).toBeInTheDocument();
    expect(screen.queryByText('packs.runnerSlowHint')).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(15000));
    expect(screen.getByText('packs.runnerSlowHint')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'stopRequest' }));
    expect(screen.queryByText('packs.runnerSlowHint')).not.toBeInTheDocument();
    expect(screen.queryByText('packs.runnerWaitTime')).not.toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});
