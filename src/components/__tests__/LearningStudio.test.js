import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LearningStudio from '@/components/learn/LearningStudio';
import { LEARN_STORAGE_KEY } from '@/lib/learn/journeys';
import messages from '../../../messages/en.json';

jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations:
    () =>
    (key, values = {}) =>
      Object.entries(values).reduce(
        (str, [name, value]) => str.replace(`{${name}}`, value),
        messages.LearnStudio[key] || key
      ),
}));
jest.mock('@/i18n/routing', () => ({
  Link: ({ children, prefetch, ...props }) => <a {...props}>{children}</a>,
}));

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/en/ogren');
  Element.prototype.scrollIntoView = jest.fn();
});

test('opens a route, records a lesson and restores its progress and notes', async () => {
  const view = render(<LearningStudio />);
  fireEvent.click((await screen.findAllByRole('button', { name: 'Start route' }))[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Mark lesson complete' }));
  fireEvent.change(screen.getByLabelText('My learning notes'), {
    target: { value: 'I verified the summary.' },
  });
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem(LEARN_STORAGE_KEY)).completed['chatbotlar:understand']
    ).toBe(true)
  );
  expect(window.location.search).toContain('route=chatbotlar');
  view.unmount();
  render(<LearningStudio />);
  expect(await screen.findByDisplayValue('I verified the summary.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Undo completion' })).toBeInTheDocument();
});

test('review completion requires a correct answer and actual exercise checks', async () => {
  render(<LearningStudio />);
  fireEvent.click((await screen.findAllByRole('button', { name: 'Start route' }))[0]);
  fireEvent.click(screen.getByRole('button', { name: '3. Review' }));
  const complete = screen.getByRole('button', { name: 'Mark lesson complete' });
  expect(complete).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Assume a long answer is correct.'));
  expect(screen.getByText('Read the core idea again and try another answer.')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Verify important claims against original sources.'));
  fireEvent.click(screen.getByLabelText('I checked two claims against the source.'));
  expect(complete).toBeDisabled();
  fireEvent.click(screen.getByLabelText('I revised the summary in my own words.'));
  expect(complete).toBeEnabled();
});

test('filters saved routes and clears an empty search', async () => {
  render(<LearningStudio />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Save Your first AI assistant session' })
  );
  fireEvent.click(screen.getByLabelText('Saved routes'));
  expect(screen.getAllByRole('button', { name: 'Start route' })).toHaveLength(1);
  fireEvent.change(screen.getByPlaceholderText('Summary, images, coding…'), {
    target: { value: 'does not exist' },
  });
  expect(screen.queryByRole('button', { name: 'Start route' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getAllByRole('button', { name: 'Start route' })).toHaveLength(8);
});
