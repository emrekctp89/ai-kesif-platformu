import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditToolDialog } from '@/components/EditToolDialog';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/app/actions', () => ({ updateTool: jest.fn(), assignTagsToTool: jest.fn() }));
jest.mock('@/components/ToolVariantManager', () => ({ ToolVariantManager: () => null }));
jest.mock('@/components/TranslateButton', () => ({ TranslateButton: () => null }));

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = jest.fn();
});

it('lets the admin approve a flagged link and resets the decision when the URL changes', () => {
  render(
    <EditToolDialog
      tool={{
        id: 1,
        name: 'Example',
        link: 'https://example.com/',
        link_check_status: 'invalid',
        link_check_error: 'HTTP 405',
        tool_tags: [],
      }}
      categories={[]}
      allTags={[]}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Düzenle' }));
  expect(screen.getByText('HTTP 405')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Linki aç/ })).toHaveAttribute(
    'href',
    'https://example.com/'
  );
  const decision = screen.getByLabelText('Admin kararı');
  fireEvent.change(decision, { target: { value: 'manual_valid' } });
  expect(decision).toHaveValue('manual_valid');
  fireEvent.change(screen.getByLabelText('Link'), { target: { value: 'https://example.com/new' } });
  expect(decision).toHaveValue('keep');
  fireEvent.change(decision, { target: { value: 'automatic' } });
  expect(decision).toHaveValue('automatic');
});
