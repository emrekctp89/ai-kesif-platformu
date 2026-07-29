jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }));

import {
  buildRetrievalQuery,
  buildSearchFilter,
  expandSearchTerms,
  includesNormalized,
  includesNormalizedConcept,
  includesNormalizedToken,
  mergeHybridResults,
  normalizeText,
  scoreLexicalMatch,
  shouldUseVectorFallback,
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

  it('çok kelimeli evidence ifadelerini filtre için parçalar', () => {
    const filter = buildSearchFilter(['logo tasarım', 'keyword research']);
    expect(filter).toContain('name.ilike.%logo%');
    expect(filter).toContain('name.ilike.%tasarım%');
    expect(filter).toContain('name.ilike.%keyword%');
    expect(filter).toContain('name.ilike.%research%');
    expect(filter).not.toContain('%logo tasarım%');
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

  it('katı token eşlemesi bi→bir false-positive üretmez', () => {
    expect(includesNormalizedToken('bir resim çizmek istiyorum', 'bi')).toBe(false);
    expect(includesNormalizedConcept('bir resim çizmek istiyorum', 'bi')).toBe(false);
    expect(includesNormalizedToken('seo analizi', 'seo')).toBe(true);
    expect(includesNormalizedToken('sohbet asistanı öner', 'sohbet asistan')).toBe(true);
    // Uzun stem kavramlar hâlâ çalışır
    expect(includesNormalizedConcept('metni çevirmek istiyorum', 'çevir')).toBe(true);
  });
  it('yüksek güvenli lexical sonuçlarda fast path üzerinde kalır', () => {
    const rows = ['Analyzer', 'Writer', 'Tracker'].map((name, id) => ({
      id,
      name: `SEO ${name}`,
      description: 'SEO aracı',
    }));
    expect(scoreLexicalMatch(rows[0], ['seo'])).toBe(3);
    expect(shouldUseVectorFallback(rows, ['seo'], 3)).toBe(false);
  });

  it('zayıf lexical sonuçlarda vektör fallback ister', () => {
    expect(
      shouldUseVectorFallback(
        [{ id: 1, name: 'Genel', description: 'Blog ekiplerine yardımcı' }],
        ['blog'],
        3
      )
    ).toBe(true);
  });

  it('hibrit sonuçları vektör öncelikli ve tekrarsız birleştirir', () => {
    expect(
      mergeHybridResults([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }]).map((row) => row.id)
    ).toEqual([2, 3, 1]);
  });
});
