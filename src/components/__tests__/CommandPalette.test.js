import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';
import { runGlobalSearch } from '@/app/actions/globalSearch';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/app/actions/globalSearch', () => ({ runGlobalSearch: jest.fn() }));
jest.mock('use-debounce', () => ({ useDebounce: (value) => [value] }));
jest.mock('@/components/ui/dialog', () => ({
  DialogTitle: ({ children }) => <div>{children}</div>,
  DialogDescription: ({ children }) => <div>{children}</div>,
}));
jest.mock('@/components/ui/command', () => {
  const Container = ({ children }) => <div>{children}</div>;
  return {
    CommandDialog: ({ open, children }) => (open ? <div>{children}</div> : null),
    CommandInput: ({ onValueChange, ...props }) => (
      <input {...props} onChange={(event) => onValueChange(event.target.value)} />
    ),
    CommandEmpty: Container,
    CommandGroup: Container,
    CommandItem: Container,
    CommandList: Container,
    CommandSeparator: () => null,
  };
});

function openSearch() {
  render(<CommandPalette />);
  fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
  return screen.getByRole('textbox');
}

beforeEach(() => jest.clearAllMocks());

it('opens from the search button and ignores held shortcut repeats', () => {
  render(<CommandPalette />);
  fireEvent.click(screen.getByRole('button', { name: 'Hızlı aramayı aç' }));
  expect(screen.getByRole('textbox')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'k', ctrlKey: true, repeat: true });
  expect(screen.getByRole('textbox')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'K', ctrlKey: true });
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

it('keeps the latest results when an older request finishes last', async () => {
  let finishOld;
  runGlobalSearch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishOld = resolve;
      })
  );
  runGlobalSearch.mockResolvedValueOnce({
    results: [{ title: 'Yeni sonuç', url: '/new', result_type: 'Tool' }],
    suggestions: [],
  });
  const input = openSearch();
  fireEvent.change(input, { target: { value: 'eski' } });
  fireEvent.change(input, { target: { value: 'yeni' } });
  expect(await screen.findByText('Yeni sonuç')).toBeInTheDocument();
  await act(async () =>
    finishOld({
      results: [{ title: 'Eski sonuç', url: '/old', result_type: 'Tool' }],
      suggestions: [],
    })
  );
  expect(screen.queryByText('Eski sonuç')).not.toBeInTheDocument();
  expect(screen.getByText('Yeni sonuç')).toBeInTheDocument();
});

it('recovers from a rejected request and allows another search', async () => {
  runGlobalSearch.mockRejectedValueOnce(new Error('offline'));
  const input = openSearch();
  fireEvent.change(input, { target: { value: 'arama' } });
  expect(
    await screen.findByText('Arama tamamlanamadı. Lütfen tekrar deneyin.')
  ).toBeInTheDocument();
  fireEvent.change(input, { target: { value: '' } });
  expect(screen.getByText('Aramak için en az 2 karakter yazın.')).toBeInTheDocument();
  expect(screen.queryByText('Aranıyor...')).not.toBeInTheDocument();
});

it('retries the same query after a server error', async () => {
  runGlobalSearch.mockResolvedValueOnce({ error: 'Database connection failed' });
  runGlobalSearch.mockResolvedValueOnce({
    results: [{ title: 'Başarılı sonuç', url: '/success', result_type: 'Tool' }],
    suggestions: [],
  });
  const input = openSearch();
  fireEvent.change(input, { target: { value: 'tasarım' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Tekrar dene' }));
  expect(await screen.findByText('Başarılı sonuç')).toBeInTheDocument();
  expect(runGlobalSearch).toHaveBeenNthCalledWith(2, 'tasarım');
  expect(screen.queryByRole('button', { name: 'Tekrar dene' })).not.toBeInTheDocument();
  expect(screen.queryByText('Database connection failed')).not.toBeInTheDocument();
});
