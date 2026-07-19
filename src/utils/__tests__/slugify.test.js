import { slugify } from '../slugify';

describe('slugify', () => {
  it('converts Turkish characters and spaces', () => {
    expect(slugify('Yapay Zeka Araçları')).toBe('yapay-zeka-araclari');
    expect(slugify('Şirket & Ürün')).toBe('sirket-and-urun');
    expect(slugify('İstanbul Öğrenci')).toBe('istanbul-ogrenci');
  });

  it('strips punctuation and collapses dashes', () => {
    expect(slugify('Hello!!! World---Test')).toBe('hello-world-test');
    expect(slugify('  leading trailing  ')).toBe('leading-trailing');
  });
});
