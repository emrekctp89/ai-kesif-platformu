import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';
import { runGlobalSearch } from '@/app/actions/globalSearch';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
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
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  HTMLElement.prototype.scrollIntoView = jest.fn();
});
afterAll(() => {
  global.ResizeObserver = originalResizeObserver;
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
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
  expect(await screen.findByText('Midjourney')).toBeVisible();
  expect(screen.getByText('Yeni Araç Öner')).toBeVisible();
});
