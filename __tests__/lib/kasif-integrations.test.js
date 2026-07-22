jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/utils/supabase/actions', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/kasif/retrieval', () => ({
  ...jest.requireActual('@/lib/kasif/retrieval'),
  retrievePlatformContext: jest.fn(),
}));
jest.mock('@/lib/kasif/config', () => ({
  assertKasifEnabled: jest.fn(),
}));

import { retrievePlatformContext } from '@/lib/kasif/retrieval';
import { createClient } from '@/utils/supabase/actions';
import { assertKasifEnabled } from '@/lib/kasif/config';
import {
  compareSelectedToolsWithKasif,
  compareToolsWithKasif,
  getKasifAssistantAnswer,
  getKasifRecommendations,
} from '@/lib/kasif/integrations';

const toolRecords = [
  {
    id: 1,
    name: 'Slayt Free',
    slug: 'slayt-free',
    description: 'Sunum ve slayt oluşturur',
    pricing_model: 'freemium',
  },
];

describe('Kâşif site integrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    retrievePlatformContext.mockResolvedValue(toolRecords);
  });

  it('tavsiye sayfasının kart sözleşmesine Kâşif sıralaması döndürür', async () => {
    const result = await getKasifRecommendations('Ücretsiz sunum aracı öner');

    expect(result.recommendations).toEqual([
      expect.objectContaining({ name: 'Slayt Free', slug: 'slayt-free' }),
    ]);
    expect(result.recommendations[0].reason).toContain('uygun');
    expect(assertKasifEnabled).toHaveBeenCalledTimes(1);
  });

  it('konsiyerj için grounded cevap ve tıklanabilir araç kaynağı döndürür', async () => {
    const result = await getKasifAssistantAnswer('Sunum hazırlamak için araç öner');

    expect(result.spoken_response).toContain('Slayt Free');
    expect(result.suggested_content).toEqual([
      { type: 'Araç', title: 'Slayt Free', url: '/tool/slayt-free' },
    ]);
    expect(assertKasifEnabled).toHaveBeenCalledTimes(1);
  });

  it('karşılaştırmayı yalnızca verilen platform kayıtlarından üretir', () => {
    const result = compareToolsWithKasif([
      {
        name: 'Araç A',
        category_name: 'Kodlama',
        pricing_model: 'Freemium',
        average_rating: 4.7,
        total_ratings: 12,
        platforms: ['Web'],
      },
      {
        name: 'Araç B',
        description: 'Toplantı notlarını özetler.',
        average_rating: 0,
        total_ratings: 0,
      },
    ]);

    expect(result.comparison_summary).toContain('Araç A 4.7/5');
    expect(result.detailed_analysis).toHaveLength(2);
    expect(result.detailed_analysis[0].pros).toContain('Fiyat modeli: Freemium');
    expect(result.detailed_analysis[1].cons).toContain(
      'Karar vermek için kullanıcı puanı verisi sınırlı.'
    );
  });

  it('client alanlarına güvenmeden seçili araçları veritabanından yeniden okur', async () => {
    const eq = jest.fn().mockResolvedValue({
      data: [
        { name: 'Araç A', slug: 'arac-a', average_rating: 4.5, total_ratings: 10 },
        { name: 'Araç B', slug: 'arac-b', average_rating: 4, total_ratings: 8 },
      ],
      error: null,
    });
    const inFilter = jest.fn(() => ({ eq }));
    const select = jest.fn(() => ({ in: inFilter }));
    createClient.mockResolvedValue({ from: jest.fn(() => ({ select })) });

    const result = await compareSelectedToolsWithKasif(['arac-b', 'arac-a']);

    expect(inFilter).toHaveBeenCalledWith('slug', ['arac-b', 'arac-a']);
    expect(result.detailed_analysis.map((tool) => tool.tool_name)).toEqual(['Araç B', 'Araç A']);
    expect(assertKasifEnabled).toHaveBeenCalledTimes(1);
  });

  it('özellik bayrağı kapalıyken platform verisine erişmez', async () => {
    assertKasifEnabled.mockImplementationOnce(() => {
      throw new Error('KASIF_DISABLED');
    });

    await expect(getKasifRecommendations('Ücretsiz sunum aracı öner')).rejects.toThrow(
      'KASIF_DISABLED'
    );
    expect(retrievePlatformContext).not.toHaveBeenCalled();
  });
});
