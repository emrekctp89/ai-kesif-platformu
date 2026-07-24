import { groundModelResponse, NO_INFORMATION_ANSWER } from '@/lib/kasif/grounding';

const records = [{ id: 7, name: 'Test Aracı', slug: 'test-araci' }];

describe('Kâşif grounding', () => {
  it('yalnızca veritabanındaki kaynakları kabul eder', () => {
    expect(
      groundModelResponse(
        { answer: 'Yanıt', sourceIds: ['tool:7', 'tool:999'], insufficientContext: false },
        records
      )
    ).toEqual({
      answer: 'Yanıt',
      grounded: true,
      sources: [{ id: 'tool:7', type: 'tool', title: 'Test Aracı', url: '/tr/tool/test-araci' }],
    });
  });

  it('İngilizce yanıtta yerelleştirilmiş boş durum ve kaynak bağlantısı üretir', () => {
    expect(
      groundModelResponse(
        { answer: 'Answer', sourceIds: ['tool:7'], insufficientContext: false },
        records,
        'en'
      )
    ).toMatchObject({
      answer: 'Answer',
      sources: [{ url: '/en/tool/test-araci' }],
    });

    expect(groundModelResponse({ insufficientContext: true }, records, 'en').answer).toBe(
      'There is no verified information on our platform that can answer this question.'
    );
  });

  it('geçerli kaynak yoksa cevabı reddeder', () => {
    expect(
      groundModelResponse(
        { answer: 'Uydurma yanıt', sourceIds: ['tool:999'], insufficientContext: false },
        records
      )
    ).toEqual({ answer: NO_INFORMATION_ANSWER, sources: [], grounded: false });
  });

  it('meta yanıtları kaynaksız grounded kabul eder', () => {
    expect(
      groundModelResponse(
        {
          answer: 'Ben Kâşif’im',
          sourceIds: [],
          meta: true,
          metaKind: 'identity',
        },
        records
      )
    ).toEqual({
      answer: 'Ben Kâşif’im',
      sources: [],
      grounded: true,
      meta: true,
      metaKind: 'identity',
      softLanding: false,
    });
  });
});
