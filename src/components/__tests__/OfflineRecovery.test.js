import { fireEvent, render, screen } from '@testing-library/react';
import { OfflineRecovery } from '../OfflineRecovery';
let mockLocale = 'tr';
jest.mock('next-intl', () => ({
  useTranslations: () => (key) =>
    (mockLocale === 'en'
      ? require('../../../messages/en.json')
      : require('../../../messages/tr.json')
    ).Offline[key],
}));
beforeEach(() => {
  mockLocale = 'tr';
});

it('shows English connection guidance in English mode', () => {
  mockLocale = 'en';
  render(<OfflineRecovery homeHref="/en" />);
  expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent("You're back online");
});

it('enables retry when the connection returns and disables it if lost again', () => {
  const connection = jest.spyOn(window.navigator, 'onLine', 'get');
  try {
    connection.mockReturnValue(false);
    render(<OfflineRecovery />);
    expect(screen.getByRole('button', { name: 'Yeniden Dene' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('İnternet bağlantısı bekleniyor');
    connection.mockReturnValue(true);
    fireEvent(window, new Event('online'));
    expect(screen.getByRole('button', { name: 'Yeniden Dene' })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('Bağlantı geri geldi');
    connection.mockReturnValue(false);
    fireEvent(window, new Event('offline'));
    expect(screen.getByRole('button', { name: 'Yeniden Dene' })).toBeDisabled();
  } finally {
    connection.mockRestore();
  }
});
