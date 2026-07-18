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
      sources: [{ id: 'tool:7', type: 'tool', title: 'Test Aracı', url: '/tool/test-araci' }],
    });
  });

  it('geçerli kaynak yoksa cevabı reddeder', () => {
    expect(
      groundModelResponse(
        { answer: 'Uydurma yanıt', sourceIds: ['tool:999'], insufficientContext: false },
        records
      )
    ).toEqual({ answer: NO_INFORMATION_ANSWER, sources: [], grounded: false });
  });
});
