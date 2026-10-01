import { fireEvent, render, screen } from '@testing-library/react';
import { OfflineRecovery } from '../OfflineRecovery';

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
