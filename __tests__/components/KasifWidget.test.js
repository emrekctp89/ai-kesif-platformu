import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next-intl', () => ({
  useLocale: () => 'tr',
  useMessages: () => require('../../messages/tr.json'),
  useTranslations: (namespace) => {
    const messages = require('../../messages/tr.json')[namespace];
    return (key, values) => {
      let text = key.split('.').reduce((value, part) => value?.[part], messages);
      if (typeof text === 'string' && values && typeof values === 'object') {
        for (const [name, value] of Object.entries(values)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    };
  },
}));

import { KasifWidget } from '@/components/kasif/KasifWidget';

const PACK_ACCESS_RESPONSE = {
  ok: true,
  json: async () => ({
    isPro: false,
    isAuthenticated: false,
    freeRunsLeft: 2,
    freeProPackQuota: 2,
    packs: {},
  }),
};

beforeEach(() => {
  window.requestAnimationFrame = (callback) => callback();
  Element.prototype.scrollIntoView = jest.fn();
  sessionStorage.clear();
  global.fetch = jest.fn(async (url) => {
    const path = String(url || '');
    if (path.includes('/api/kasif/pack-access')) return PACK_ACCESS_RESPONSE;
    return { ok: true, json: async () => ({}) };
  });
});

describe('Kâşif widget', () => {
  it('devre dışıyken hiçbir şey render etmez', () => {
    const { container } = render(<KasifWidget enabled={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('açma butonunu erişilebilir etiketle gösterir ve panel kapalı başlar', () => {
    render(<KasifWidget enabled />);
    expect(screen.getByRole('button', { name: "Kâşif'i aç" })).toBeInTheDocument();
    expect(screen.queryByText('Tam sayfada aç')).not.toBeInTheDocument();
  });

  it('butona tıklanınca paneli açar ve tam sayfa linkini gösterir', () => {
    render(<KasifWidget enabled />);
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'i aç" }));

    expect(screen.getByText('Tam sayfada aç').closest('a')).toHaveAttribute(
      'href',
      '/kasif-deney'
    );
    expect(screen.getByRole('button', { name: "Kâşif'i kapat" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kâşif' })).toBeInTheDocument();
  });

  it('kapat butonuna tıklanınca paneli kapatır', async () => {
    render(<KasifWidget enabled />);
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'i aç" }));
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'i kapat" }));

    await waitFor(() =>
      expect(screen.queryByText('Tam sayfada aç')).not.toBeInTheDocument()
    );
  });
});
