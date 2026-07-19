jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }));

import { answerQuestion, rankTools, understandQuestion } from '@/lib/kasif/engine';

const records = [
  {
    id: 1,
    name: 'Sunum Pro',
    slug: 'sunum-pro',
    description: 'Hızlı sunum hazırlar',
    pricing_model: 'paid',
  },
  {
    id: 2,
    name: 'Slayt Free',
    slug: 'slayt-free',
    description: 'Sunum ve slayt hazırlar',
    pricing_model: 'freemium',
    is_verified: true,
  },
];

const meetingRecords = [
  { id: 3, name: 'Generic Chat', description: 'Ekip iletişimi ve toplantı platformu' },
  {
    id: 4,
    name: 'Meeting Notes',
    description: 'Toplantı kaydını transkript ve özet haline getirir',
  },
];

describe('Kâşif engine', () => {
  it('ücretsiz araç niyetini belirler', () => {
    const intent = understandQuestion(
      'Ücretsiz sunum hazırlamak için hangi araçları kullanabilirim?'
    );
    expect(intent.wantsFree).toBe(true);
    expect(intent.tokens).toEqual(['sunum']);
  });

  it('fiyat tercihini sıralamaya yansıtır', () => {
    expect(rankTools(records, understandQuestion('Ücretsiz sunum aracı'))[0].record.id).toBe(2);
  });

  it('yalnızca sıralanan kayıtlarla kaynaklı cevap üretir', () => {
    const result = answerQuestion('Ücretsiz sunum aracı', records);
    expect(result.insufficientContext).toBe(false);
    expect(result.answer).toContain('Slayt Free');
    expect(result.sourceIds[0]).toBe('tool:2');
  });

  it('genel kategori eşleşmesi yerine doğrudan görev yeteneğini öne alır', () => {
    const intent = understandQuestion('Toplantı notlarını otomatik özetlemek istiyorum');
    expect(intent.goals).toContain('meeting-notes');
    expect(rankTools(meetingRecords, intent)[0].record.id).toBe(4);
  });

  it('ücretli olmasın ifadesini ücretsiz tercihine dönüştürür', () => {
    const intent = understandQuestion('Sunum aracı ücretli olmasın');
    expect(intent.wantsFree).toBe(true);
    expect(intent.wantsPaid).toBe(false);
  });

  it('uygun seçenek varken fiyat tercihini katı filtre olarak uygular', () => {
    const ranked = rankTools(records, understandQuestion('Ücretsiz sunum aracı'));
    expect(ranked.every(({ record }) => record.pricing_model === 'freemium')).toBe(true);
  });

  it('karşılaştırma yanıtında kategori ve fiyat bilgisini gösterir', () => {
    const comparisonRecords = records.map((record) => ({
      ...record,
      category: { name: 'Üretkenlik' },
    }));
    const result = answerQuestion('Bu sunum araçlarını karşılaştır', comparisonRecords);
    expect(result.answer).toContain('Üretkenlik');
    expect(result.answer).toContain('Freemium');
  });
});
