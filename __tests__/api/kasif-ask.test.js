const enforceRateLimit = jest.fn();
const assertKasifEnabled = jest.fn();
const retrievePlatformContext = jest.fn();
const answerQuestion = jest.fn();
const answerMetaQuestion = jest.fn();
const groundModelResponse = jest.fn();
const createAdminClient = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, options = {}) => ({
      status: options.status || 200,
      json: async () => body,
    }),
  },
}));
jest.mock('@/utils/antiAbuse', () => ({
  enforceRateLimit: (...args) => enforceRateLimit(...args),
}));
jest.mock('@/lib/kasif/config', () => ({
  assertKasifEnabled: (...args) => assertKasifEnabled(...args),
}));
jest.mock('@/lib/kasif/retrieval', () => ({
  retrievePlatformContext: (...args) => retrievePlatformContext(...args),
}));
jest.mock('@/lib/kasif/engine', () => ({
  answerQuestion: (...args) => answerQuestion(...args),
  answerMetaQuestion: (...args) => answerMetaQuestion(...args),
}));
jest.mock('@/lib/kasif/grounding', () => ({
  noInformationAnswer: (locale) =>
    locale === 'en'
      ? 'There is no verified information on our platform that can answer this question.'
      : 'Platformumuzda bu soruyu yanıtlayacak doğrulanmış bilgi bulunmuyor.',
  groundModelResponse: (...args) => groundModelResponse(...args),
}));
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: (...args) => createAdminClient(...args),
}));
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn() },
}));

import { POST } from '@/app/api/kasif/ask/route';

function requestWith(body, headers = {}) {
  return {
    headers: { get: (name) => headers[name] || null },
    json: async () => body,
  };
}

describe('Kâşif ask API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    enforceRateLimit.mockResolvedValue({ allowed: true });
    answerMetaQuestion.mockReturnValue(null);
    retrievePlatformContext.mockResolvedValue([{ id: 7, name: 'Slide Tool', slug: 'slide-tool' }]);
    answerQuestion.mockReturnValue({
      answer: 'Answer',
      sourceIds: ['tool:7'],
      confidence: 0.8,
      intent: { goals: ['presentation-creation'] },
    });
    groundModelResponse.mockReturnValue({ answer: 'Answer', sources: [], grounded: true });
    createAdminClient.mockImplementation(() => {
      throw new Error('storage unavailable');
    });
  });

  it('locale bilgisini motor ve grounding katmanlarına aktarır', async () => {
    const response = await POST(
      requestWith({ question: 'Recommend a presentation tool', history: [], locale: 'en' })
    );

    expect(response.status).toBe(200);
    expect(answerQuestion).toHaveBeenCalledWith(
      'Recommend a presentation tool',
      expect.any(Array),
      [],
      'en'
    );
    expect(groundModelResponse).toHaveBeenCalledWith(
      expect.objectContaining({ answer: 'Answer' }),
      expect.any(Array),
      'en'
    );
  });

  it('İngilizce boş sonuç mesajı döndürür', async () => {
    retrievePlatformContext.mockResolvedValue([]);

    const response = await POST(
      requestWith({ question: 'Recommend a presentation tool', locale: 'en' })
    );

    await expect(response.json()).resolves.toMatchObject({
      answer: 'There is no verified information on our platform that can answer this question.',
      grounded: false,
    });
    expect(answerQuestion).not.toHaveBeenCalled();
  });

  it('desteklenmeyen locale değerini güvenli Türkçe varsayılana indirger', async () => {
    const response = await POST(requestWith({ question: 'Sunum aracı öner', locale: 'de' }));

    expect(response.status).toBe(200);
    expect(answerQuestion).toHaveBeenCalledWith(expect.any(String), expect.any(Array), [], 'tr');
  });

  it('geçersiz soru uzunluğu için seçilen dilde hata döndürür', async () => {
    const response = await POST(requestWith({ question: 'x', locale: 'en' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'The question must be between 3 and 800 characters.',
    });
    expect(retrievePlatformContext).not.toHaveBeenCalled();
  });

  it('meta sorularda katalog aramasını atlar', async () => {
    answerMetaQuestion.mockReturnValue({
      answer: 'Ben Kâşif’im',
      sourceIds: [],
      confidence: 0.99,
      meta: true,
      metaKind: 'identity',
      intent: { meta: 'identity', goals: [] },
    });
    groundModelResponse.mockReturnValue({
      answer: 'Ben Kâşif’im',
      sources: [],
      grounded: true,
      meta: true,
    });

    const response = await POST(requestWith({ question: 'Sen kimsin?', locale: 'tr' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      answer: 'Ben Kâşif’im',
      grounded: true,
      confidence: 0.99,
    });
    expect(retrievePlatformContext).not.toHaveBeenCalled();
    expect(answerQuestion).not.toHaveBeenCalled();
  });
});
