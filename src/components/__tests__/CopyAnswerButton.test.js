import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { CopyAnswerButton } from '@/components/kasif/CopyAnswerButton';

jest.mock('next-intl', () => ({ useTranslations: () => (key) => key }));

it('copies the complete answer and confirms success', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(<CopyAnswerButton answer={'Birinci satır\nİkinci satır'} />);
  fireEvent.click(screen.getByRole('button', { name: 'copyAnswer' }));
  expect(writeText).toHaveBeenCalledWith('Birinci satır\nİkinci satır');
  expect(await screen.findByRole('button', { name: 'answerCopied' })).toBeEnabled();
});

it('shows a fallback message and allows retry when clipboard access fails', async () => {
  const writeText = jest.fn().mockRejectedValue(new Error('Permission denied'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(<CopyAnswerButton answer="Yanıt" />);
  fireEvent.click(screen.getByRole('button', { name: 'copyAnswer' }));
  expect(await screen.findByText('copyAnswerError')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'copyAnswer' })).toBeEnabled();
});

it('does not offer copying for an empty answer', () => {
  render(<CopyAnswerButton answer="  " />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
