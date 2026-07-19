jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }));

import {
  buildRetrievalQuery,
  buildSearchFilter,
  expandSearchTerms,
  normalizeText,
} from '@/lib/kasif/retrieval';

describe('Kâşif semantic retrieval', () => {
  it('Türkçe metni aksanlardan bağımsız normalize eder', () => {
    expect(normalizeText('Görsel ve yazılım')).toBe('gorsel ve yazilim');
  });

  it('görsel üretim sorgusunu alan eş anlamlarıyla genişletir', () => {
    const terms = expandSearchTerms('Ücretsiz resim çizmek istiyorum');
    expect(terms).toEqual(expect.arrayContaining(['resim', 'görsel', 'fotoğraf', 'illüstrasyon']));
  });

  it('sunum sorgusuna slayt varyantını ekler', () => {
    expect(expandSearchTerms('Sunum hazırlamak istiyorum')).toContain('slayt');
  });

  it('açık konu değişikliğinde geçmiş konuyu retrieval sorgusuna taşımaz', () => {
    const query = buildRetrievalQuery(
      'Hayır, bu kez görsel oluşturmak istiyorum',
      [{ role: 'user', content: 'Ücretsiz sunum hazırlamak için araç öner' }],
      { isolateCurrentTopic: true }
    );

    expect(query).toBe('Hayır, bu kez görsel oluşturmak istiyorum');
    expect(query).not.toContain('sunum');
  });

  it('konusuz takip sorusunda önceki kullanıcı bağlamını korur', () => {
    const query = buildRetrievalQuery('Peki bunlardan ücretsiz olanlar hangileri?', [
      { role: 'user', content: 'Sunum hazırlamak için araç öner' },
      { role: 'assistant', content: 'Sunum araçlarını sıraladım.' },
    ]);

    expect(query).toContain('Sunum hazırlamak için araç öner');
    expect(query).toContain('Peki bunlardan ücretsiz olanlar hangileri?');
  });

  it('tüm terimleri tek PostgREST OR filtresinde birleştirir', () => {
    expect(buildSearchFilter(['sunum', 'slayt'])).toBe(
      'name.ilike.%sunum%,description.ilike.%sunum%,name.ilike.%slayt%,description.ilike.%slayt%'
    );
  });
});
