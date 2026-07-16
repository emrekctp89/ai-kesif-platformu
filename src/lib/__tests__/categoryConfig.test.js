import {
  CATEGORY_SEED,
  getCategoryCount,
  getCategoryConfig,
  sortCategoriesByCanonicalOrder,
} from '../categoryConfig';

describe('categoryConfig', () => {
  it('keeps the expanded category seed unique and configured', () => {
    const slugs = new Set(CATEGORY_SEED.map((category) => category.slug));
    const names = new Set(CATEGORY_SEED.map((category) => category.name));

    expect(CATEGORY_SEED).toHaveLength(161);
    expect(getCategoryCount()).toBe(161);
    expect(slugs.size).toBe(CATEGORY_SEED.length);
    expect(names.size).toBe(CATEGORY_SEED.length);

    for (const category of CATEGORY_SEED) {
      const config = getCategoryConfig(category.slug);
      expect(config.description).toBeTruthy();
      expect(config.icon).toBeTruthy();
    }
  });

  it('sorts database categories by canonical product order', () => {
    const sorted = sortCategoriesByCanonicalOrder([
      { name: 'SEO', slug: 'seo' },
      { name: 'Görsel & Video', slug: 'gorsel-video' },
      { name: 'Özel Kategori', slug: 'ozel-kategori' },
      { name: 'Kod & Yazılım', slug: 'kod-yazilim' },
    ]);

    expect(sorted.map((category) => category.slug)).toEqual([
      'gorsel-video',
      'kod-yazilim',
      'seo',
      'ozel-kategori',
    ]);
  });
});
