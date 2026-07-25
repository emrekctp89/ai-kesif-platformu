import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('next-intl', () => ({
  useLocale: () => 'tr',
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

import KasifExperiment from '@/app/[locale]/kasif-deney/KasifExperiment';

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

function mockFetchHandlers(handlers = {}) {
  global.fetch = jest.fn(async (url, options) => {
    const path = String(url || '');
    if (path.includes('/api/kasif/pack-access')) {
      return handlers.packAccess || PACK_ACCESS_RESPONSE;
    }
    if (path.includes('/api/kasif/ask') && handlers.ask) {
      return typeof handlers.ask === 'function' ? handlers.ask(url, options) : handlers.ask;
    }
    if (path.includes('/api/kasif/feedback') && handlers.feedback) {
      return typeof handlers.feedback === 'function'
        ? handlers.feedback(url, options)
        : handlers.feedback;
    }
    if (path.includes('/api/kasif/funnel') && handlers.funnel) {
      return typeof handlers.funnel === 'function'
        ? handlers.funnel(url, options)
        : handlers.funnel;
    }
    if (handlers.default) {
      return typeof handlers.default === 'function'
        ? handlers.default(url, options)
        : handlers.default;
    }
    return { ok: true, json: async () => ({}) };
  });
}

describe('Kâşif ekranı', () => {
  beforeEach(() => {
    window.requestAnimationFrame = (callback) => callback();
    Element.prototype.scrollIntoView = jest.fn();
    mockFetchHandlers();
    sessionStorage.clear();
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

  it('boş durumda iş paketleri şeridini gösterir', () => {
    render(<KasifExperiment />);

    expect(
      screen.getByRole('heading', { name: /Tek araç değil — işi bitiren paket/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/İçerik stüdyosu/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Paketi sor' }).length).toBeGreaterThan(0);
  });

  it('yanıtın arayüz diliyle üretilmesi için locale bilgisini gönderir', async () => {
    mockFetchHandlers({
      ask: {
        ok: true,
        json: async () => ({ answer: 'Yanıt', sources: [] }),
      },
    });
    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Ücretsiz sunum aracı öner' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    await screen.findByText('Yanıt');
    const askCall = global.fetch.mock.calls.find(([url]) => String(url).includes('/api/kasif/ask'));
    expect(JSON.parse(askCall[1].body)).toMatchObject({ locale: 'tr' });
  });

  it('düşük güvenli yanıtta daraltma ipucu gösterir', async () => {
    mockFetchHandlers({
      ask: {
        ok: true,
        json: async () => ({
          answer: 'Zayıf eşleşme',
          sources: [{ id: 'tool:1', title: 'Araç', url: '/tr/tool/arac' }],
          grounded: true,
          confidence: 0.4,
          intent: { goals: ['content-writing'], pricePreference: 'any' },
        }),
      },
    });
    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Bir şey öner' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    expect(await screen.findByText(/Bu eşleşme düşük güvenli/i)).toBeInTheDocument();
  });

  it('kaynakları karar kartına dönüştürür ve seçilen araçları karşılaştırır', async () => {
    mockFetchHandlers({
      ask: {
        ok: true,
        json: async () => ({
          answer: 'İki güçlü seçenek buldum.',
          grounded: true,
          confidence: 0.9,
          intent: { goals: ['presentation-creation'], pricePreference: 'any' },
          sources: [
            {
              id: 'tool:1',
              title: 'Slayt AI',
              url: '/tr/tool/slayt-ai',
              description: 'Sunum taslakları ve görsel düzenler üretir.',
              category: 'Sunum',
              pricing: 'Freemium',
              rating: 4.8,
              reasons: ['göreve uygun'],
            },
            {
              id: 'tool:2',
              title: 'Deck Pro',
              url: '/tr/tool/deck-pro',
              description: 'Ekipler için ortak sunum çalışma alanı.',
              category: 'Üretkenlik',
              pricing: 'Ücretli',
              rating: 4.5,
              reasons: ['yüksek puan'],
            },
          ],
        }),
      },
    });
    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Sunum araçlarını karşılaştır' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    await screen.findByText('Sunum taslakları ve görsel düzenler üretir.');
    const compareButtons = screen.getAllByRole('button', { name: /karşılaştırmaya ekle/i });
    fireEvent.click(compareButtons[0]);
    fireEvent.click(compareButtons[1]);

    expect(screen.getByText('Karar tablosu')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Fiyat' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'İlk iki seçeneği ayrıntılı karşılaştır' })
    ).toBeInTheDocument();
  });

  it('eşleşmesiz yanıtta platform ipucu gösterir', async () => {
    mockFetchHandlers({
      ask: {
        ok: true,
        json: async () => ({
          answer: 'Bilgi yok',
          sources: [],
          grounded: false,
          confidence: 0,
        }),
      },
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

  it('soft-landing yanıtında starter chip gösterir', async () => {
    mockFetchHandlers({
      ask: {
        ok: true,
        json: async () => ({
          answer: 'Önceki liste yok',
          sources: [],
          grounded: true,
          softLanding: true,
          meta: true,
          metaKind: 'soft-landing',
          confidence: 0.92,
          intent: { meta: 'soft-landing', pricePreference: 'free', goals: [] },
        }),
      },
    });
    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Peki bunlardan ücretsiz olanlar hangileri?' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    expect(await screen.findByText(/Görevi netleştir/i)).toBeInTheDocument();
    // Soft-landing bloğunda starter chip'ler görünür (boş durum starterlarından ayrı).
    expect(screen.getAllByRole('button', { name: 'Sunum hazırla' }).length).toBeGreaterThan(0);
  });

  it('soft-landing chip tıklanınca yeni soruyu otomatik gönderir', async () => {
    let askCount = 0;
    mockFetchHandlers({
      ask: async () => {
        askCount += 1;
        if (askCount === 1) {
          return {
            ok: true,
            json: async () => ({
              answer: 'Önceki liste yok',
              sources: [],
              grounded: true,
              softLanding: true,
              meta: true,
              metaKind: 'soft-landing',
              confidence: 0.92,
              intent: { meta: 'soft-landing', goals: [] },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            answer: 'Sunum önerisi',
            sources: [{ id: 'tool:1', title: 'Slayt', url: '/tr/tool/slayt', pricing: 'Freemium' }],
            grounded: true,
            confidence: 0.9,
            intent: { goals: ['presentation-creation'] },
          }),
        };
      },
    });

    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Peki bunlardan ücretsiz olanlar hangileri?' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));
    await screen.findByText(/Görevi netleştir/i);

    const sunumChips = screen.getAllByRole('button', { name: 'Sunum hazırla' });
    fireEvent.click(sunumChips[sunumChips.length - 1]);

    await screen.findByText('Sunum önerisi');
    const askCalls = global.fetch.mock.calls.filter(([url]) =>
      String(url).includes('/api/kasif/ask')
    );
    expect(askCalls).toHaveLength(2);
    const secondBody = JSON.parse(askCalls[1][1].body);
    expect(secondBody.question).toMatch(/sunum/i);
  });

  it('yeni konuşma başlatıldığında bekleyen isteği iptal eder', () => {
    let requestSignal;
    mockFetchHandlers({
      ask: (_url, options) => {
        requestSignal = options.signal;
        return new Promise(() => {});
      },
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

  it('başarısız soruyu yeniden dene ile otomatik tekrar gönderir', async () => {
    let askCount = 0;
    mockFetchHandlers({
      ask: async () => {
        askCount += 1;
        if (askCount === 1) throw new Error('network');
        return {
          ok: true,
          json: async () => ({ answer: 'İkinci deneme yanıtı', sources: [] }),
        };
      },
    });
    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Ücretsiz sunum aracı öner' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Yeniden dene' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));

    await screen.findByText('İkinci deneme yanıtı');
    const askCalls = global.fetch.mock.calls.filter(([url]) =>
      String(url).includes('/api/kasif/ask')
    );
    expect(askCalls).toHaveLength(2);
  });

  it('öneri kartında görev kurulum CTA gösterir', async () => {
    mockFetchHandlers({
      ask: {
        ok: true,
        json: async () => ({
          answer: 'İki seçenek.',
          grounded: true,
          confidence: 0.9,
          intent: { goals: ['presentation-creation'] },
          interactionId: 'int-1',
          feedbackToken: 'tok-1',
          funnel: {
            stages: {
              job_stated: '2026-07-25T10:00:00Z',
              tool_recommended: '2026-07-25T10:00:00Z',
            },
          },
          sources: [
            {
              id: 'tool:1',
              title: 'Slayt AI',
              url: '/tr/tool/slayt-ai',
              description: 'Sunum.',
              category: 'Sunum',
              pricing: 'Freemium',
              rating: 4.8,
              reasons: ['göreve uygun'],
            },
          ],
        }),
      },
    });
    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Ücretsiz sunum aracı öner' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    expect(
      await screen.findByRole('button', { name: 'Slayt AI ile kuruluma başla' })
    ).toBeInTheDocument();
    expect(screen.getByText('Bu araçla devam et')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Workmind'de adım adım planla/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/workmind?')
    );
  });

  it('devam edince goal-specific sihirbaz adımlarını ve şablonu gösterir', async () => {
    mockFetchHandlers({
      ask: {
        ok: true,
        json: async () => ({
          answer: 'Sunum için Slayt AI.',
          grounded: true,
          confidence: 0.92,
          intent: { goals: ['presentation-creation'] },
          interactionId: 'int-2',
          feedbackToken: 'tok-2',
          sources: [
            {
              id: 'tool:1',
              title: 'Slayt AI',
              url: '/tr/tool/slayt-ai',
              description: 'Sunum.',
              category: 'Sunum',
              pricing: 'Freemium',
              rating: 4.9,
              reasons: ['göreve uygun'],
            },
          ],
        }),
      },
      funnel: {
        ok: true,
        json: async () => ({ success: true, funnel: { stages: {} } }),
      },
    });

    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Ücretsiz sunum aracı öner' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    const start = await screen.findByRole('button', { name: 'Slayt AI ile kuruluma başla' });
    fireEvent.click(start);

    expect(await screen.findByText(/Sunum kurulum sihirbazı/i)).toBeInTheDocument();
    expect(screen.getByText(/Anahat \/ slayt iskeletini oluştur/i)).toBeInTheDocument();
    expect(screen.getByText(/İlk çıktı şablonları/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunum brief şablonu/i)).toBeInTheDocument();
  });

  it('geri bildirimi gönderirken çift isteği engeller ve hatayı gösterir', async () => {
    mockFetchHandlers({
      ask: {
        ok: true,
        json: async () => ({
          answer: 'Sunum Aracı uygun.',
          sources: [],
          interactionId: 42,
          feedbackToken: 'token',
        }),
      },
      feedback: async () => {
        throw new Error('network');
      },
    });
    render(<KasifExperiment />);

    fireEvent.change(screen.getByRole('textbox', { name: "Kâşif'e sor" }), {
      target: { value: 'Ücretsiz sunum aracı öner' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Kâşif'e sor" }));

    const usefulButton = await screen.findByRole('button', { name: 'Faydalı' });
    fireEvent.click(usefulButton);
    fireEvent.click(usefulButton);

    await screen.findByText('Geri bildirim kaydedilemedi. Lütfen tekrar deneyin.');
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    const feedbackCalls = global.fetch.mock.calls.filter(([url]) =>
      String(url).includes('/api/kasif/feedback')
    );
    expect(feedbackCalls).toHaveLength(1);
    expect(usefulButton).toBeEnabled();
  });
});
