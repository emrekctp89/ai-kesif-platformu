jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }));

import {
  buildRetrievalQuery,
  buildSearchFilter,
  expandSearchTerms,
  includesNormalized,
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

  it('genel yapay zeka ifadelerini ayırt edici arama terimi saymaz', () => {
    const terms = expandSearchTerms('Yapay zeka ile müzik üretmek için AI aracı öner');

    expect(terms).not.toEqual(expect.arrayContaining(['yapay', 'zeka', 'ai']));
    expect(terms.some((term) => /m[uü]zik/i.test(term))).toBe(true);
    expect(terms).toEqual(expect.arrayContaining(['şarkı']));
    // Kısa "ik" sinyali "müzik" içinde false-positive üretmemeli.
    expect(terms).not.toEqual(expect.arrayContaining(['işe alım', 'cv', 'özgeçmiş']));
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

  it('eşleşen hedef evidence kelimelerini arama terimlerine ekler', () => {
    const terms = expandSearchTerms('Markam için logo tasarlamak istiyorum');
    expect(terms).toEqual(
      expect.arrayContaining(['logo', 'logo tasarım', 'marka kimliği', 'logo maker'])
    );
  });

  it('SEO hedefi için keyword ve sıralama evidence terimleri ekler', () => {
    const terms = expandSearchTerms('Sitem için SEO analizi ve anahtar kelime araçları öner');
    expect(terms).toEqual(
      expect.arrayContaining(['seo', 'anahtar kelime', 'keyword research', 'sıralama'])
    );
  });

  it('kısa kavram sinyallerini token başında eşleştirir', () => {
    expect(includesNormalized('müzik üretmek', 'ik')).toBe(false);
    expect(includesNormalized('ik süreçleri', 'ik')).toBe(true);
    expect(includesNormalized('seo analizi', 'seo')).toBe(true);
    expect(includesNormalized('blog yazısı', 'yaz')).toBe(true);
    expect(includesNormalized('gorsel', 'seo')).toBe(false);
  });
});
