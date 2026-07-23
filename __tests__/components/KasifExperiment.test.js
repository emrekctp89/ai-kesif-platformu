import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('next-intl', () => ({
  useLocale: () => 'tr',
  useTranslations: (namespace) => {
    const messages = require('../../messages/tr.json')[namespace];
    return (key) => key.split('.').reduce((value, part) => value?.[part], messages);
  },
}));

import KasifExperiment from '@/app/[locale]/kasif-deney/KasifExperiment';

describe('Kâşif ekranı', () => {
  beforeEach(() => {
    window.requestAnimationFrame = (callback) => callback();
    Element.prototype.scrollIntoView = jest.fn();
    global.fetch = jest.fn();
  });

  it('başlangıç sorusunu giriş alanına taşır ve odağı korur', () => {
    render(<KasifExperiment />);

    fireEvent.click(screen.getByRole('button', { name: 'Sunum hazırla' }));

    const question = screen.getByRole('textbox', { name: "Kâşif'e sor" });
    expect(question).toHaveValue(
      'Ücretsiz bir sunum hazırlamak için hangi araçları kullanabilirim?'
    );
    expect(question).toHaveFocus();
    expect(screen.getByText('65/800')).toBeInTheDocument();
  });

  it('boş durumda görev odaklı örnekleri gösterir', () => {
    render(<KasifExperiment />);

    expect(screen.getByRole('heading', { name: 'Nereden başlamak istersin?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Görsel üret' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kod yaz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SEO analiz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'E-posta yaz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sohbet asistanı' })).toBeInTheDocument();
  });

  it('yanıtın arayüz diliyle üretilmesi için locale bilgisini gönderir', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Yanıt', sources: [] }),
    });
    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Ücretsiz sunum aracı öner' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    await screen.findByText('Yanıt');
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({ locale: 'tr' });
  });

  it('düşük güvenli yanıtta daraltma ipucu gösterir', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: 'Zayıf eşleşme',
        sources: [{ id: 'tool:1', title: 'Araç', url: '/tr/tool/arac' }],
        grounded: true,
        confidence: 0.4,
        intent: { goals: ['content-writing'], pricePreference: 'any' },
      }),
    });
    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Bir şey öner' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    expect(await screen.findByText(/Bu eşleşme düşük güvenli/i)).toBeInTheDocument();
  });

  it('eşleşmesiz yanıtta platform ipucu gösterir', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: 'Bilgi yok',
        sources: [],
        grounded: false,
        confidence: 0,
      }),
    });
    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Uzay gemisi motoru öner' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    expect(
      await screen.findByText(/Platform kayıtlarında net bir eşleşme bulunamadı/i)
    ).toBeInTheDocument();
  });

  it('yeni konuşma başlatıldığında bekleyen isteği iptal eder', () => {
    let requestSignal;
    global.fetch.mockImplementation((_url, options) => {
      requestSignal = options.signal;
      return new Promise(() => {});
    });
    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Ücretsiz sunum aracı öner' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));
    fireEvent.click(screen.getByRole('button', { name: 'Yeni konuşma' }));

    expect(requestSignal.aborted).toBe(true);
    expect(screen.getByRole('heading', { name: 'Nereden başlamak istersin?' })).toBeInTheDocument();
  });

  it('başarısız soruyu yeniden giriş alanına taşır', async () => {
    global.fetch.mockRejectedValue(new Error('network'));
    render(<KasifExperiment />);

    const question = screen.getByRole('textbox', { name: "Kâşif'e sor" });
    fireEvent.change(question, { target: { value: 'Ücretsiz sunum aracı öner' } });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Yeniden dene' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));

    expect(question).toHaveValue('Ücretsiz sunum aracı öner');
    expect(question).toHaveFocus();
  });

  it('geri bildirimi gönderirken çift isteği engeller ve hatayı gösterir', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          answer: 'Sunum Aracı uygun.',
          sources: [],
          interactionId: 42,
          feedbackToken: 'token',
        }),
      })
      .mockRejectedValueOnce(new Error('network'));
    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Ücretsiz sunum aracı öner' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    const usefulButton = await screen.findByRole('button', { name: 'Faydalı' });
    fireEvent.click(usefulButton);
    fireEvent.click(usefulButton);

    await screen.findByText('Geri bildirim kaydedilemedi. Lütfen tekrar deneyin.');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(usefulButton).toBeEnabled();
  });
});
