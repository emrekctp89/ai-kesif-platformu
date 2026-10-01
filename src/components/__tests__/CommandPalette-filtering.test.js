import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';
import { runGlobalSearch } from '@/app/actions/globalSearch';
let mockLocale = 'tr';
jest.mock('next-intl', () => ({
  useTranslations: () => (key) =>
    (mockLocale === 'en'
      ? require('../../../messages/en.json')
      : require('../../../messages/tr.json')
    ).GlobalSearch[key],
}));

const mockPush = jest.fn();
jest.mock('@/i18n/routing', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/app/actions/globalSearch', () => ({ runGlobalSearch: jest.fn() }));
jest.mock('use-debounce', () => ({ useDebounce: (value) => [value] }));
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <div>{children}</div>,
  DialogDescription: ({ children }) => <div>{children}</div>,
}));

const originalResizeObserver = global.ResizeObserver;
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
beforeEach(() => {
  jest.clearAllMocks();
  mockLocale = 'tr';
});
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  HTMLElement.prototype.scrollIntoView = jest.fn();
});

it('clears an in-flight search, keeps input focus, and ignores its late result', async () => {
  let resolveSearch;
  runGlobalSearch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveSearch = resolve;
      })
  );
  render(<CommandPalette />);
  fireEvent.click(screen.getByRole('button', { name: 'Hızlı aramayı aç' }));
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'ChatGPT' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aramayı temizle' }));
  expect(input).toHaveValue('');
  expect(input).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent('Aramak için en az 2 karakter yazın.');
  await act(async () =>
    resolveSearch({
      results: [{ title: 'ChatGPT', url: '/tool/chatgpt', result_type: 'Tool' }],
      suggestions: [],
    })
  );
  expect(screen.queryByText('ChatGPT')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aramayı temizle' })).not.toBeInTheDocument();
  expect(runGlobalSearch).toHaveBeenCalledTimes(1);
});
afterAll(() => {
  global.ResizeObserver = originalResizeObserver;
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
});

it('renders English search controls and errors in the English locale', async () => {
  mockLocale = 'en';
  runGlobalSearch.mockResolvedValueOnce({ error: 'provider unavailable' });
  render(<CommandPalette />);
  fireEvent.click(screen.getByRole('button', { name: 'Open quick search' }));
  expect(screen.getByRole('status')).toHaveTextContent('Type at least 2 characters');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ChatGPT' } });
  expect(screen.getByRole('button', { name: 'Clear search' })).toBeVisible();
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('Search failed. Please try again.');
});

it('shows semantic results and search status alongside quick actions', async () => {
  runGlobalSearch.mockResolvedValue({
    results: [
      {
        title: 'Midjourney',
        description: 'AI images',
        result_type: 'Tool',
        url: '/tool/midjourney',
      },
    ],
    suggestions: [],
  });
  render(<CommandPalette />);
  fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
  expect(screen.getByRole('status')).toHaveTextContent('Aramak için en az 2 karakter yazın.');
  expect(screen.getByText('Yeni Araç Öner')).toBeVisible();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'resim oluştur' } });
  expect(screen.getByRole('status')).toHaveTextContent('Aranıyor...');
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', keyCode: 13 });
  expect(mockPush).not.toHaveBeenCalled();
  expect(await screen.findByText('Midjourney')).toBeVisible();
  expect(screen.getByText('Yeni Araç Öner')).toBeVisible();
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', keyCode: 13 });
  expect(mockPush).toHaveBeenCalledWith('/tool/midjourney');
});
