jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }));

import { expandSearchTerms, normalizeText } from '@/lib/kasif/retrieval';

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
});
