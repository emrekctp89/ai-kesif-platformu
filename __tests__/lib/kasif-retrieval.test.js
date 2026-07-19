jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }));

import { buildSearchFilter, expandSearchTerms, normalizeText } from '@/lib/kasif/retrieval';

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

  it('tüm terimleri tek PostgREST OR filtresinde birleştirir', () => {
    expect(buildSearchFilter(['sunum', 'slayt'])).toBe(
      'name.ilike.%sunum%,description.ilike.%sunum%,name.ilike.%slayt%,description.ilike.%slayt%'
    );
  });
});
