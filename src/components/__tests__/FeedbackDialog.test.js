import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../../messages/en.json';
import trMessages from '../../../messages/tr.json';
import { FeedbackDialog } from '@/components/FeedbackDialog';

jest.mock('@/app/actions', () => ({ sendFeedback: jest.fn() }));

function renderFeedbackDialog(locale, messages) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <FeedbackDialog />
    </NextIntlClientProvider>
  );
}

it('renders the feedback form in English when English is selected', () => {
  renderFeedbackDialog('en', enMessages);

  fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }));

  expect(screen.getByRole('dialog')).toHaveTextContent(
    'Share your thoughts about the platform or tell us about any issues you have experienced.'
  );
  expect(screen.getByLabelText('Your email address')).toBeInTheDocument();
  expect(screen.getByLabelText('Feedback type')).toHaveValue('Genel');
  expect(screen.getByRole('option', { name: 'Bug report' })).toHaveValue('Hata');
  expect(screen.getByLabelText('Your message')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
});

it('keeps the feedback form in Turkish when Turkish is selected', () => {
  renderFeedbackDialog('tr', trMessages);

  fireEvent.click(screen.getByRole('button', { name: 'Geri Bildirim Gönder' }));

  expect(screen.getByRole('dialog')).toHaveTextContent(
    'Platformla ilgili görüşlerinizi veya yaşadığınız sorunları bizimle paylaşın.'
  );
  expect(screen.getByLabelText('E-posta adresiniz')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Hata bildirimi' })).toHaveValue('Hata');
  expect(screen.getByLabelText('Mesajınız')).toBeInTheDocument();
});
