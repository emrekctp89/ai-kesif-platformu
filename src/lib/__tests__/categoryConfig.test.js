import {
  CATEGORY_SEED,
  getCategoryCount,
  getCategoryConfig,
  sortCategoriesByCanonicalOrder,
  filterPrimaryCategories,
  PRIMARY_CATEGORIES,
} from '../categoryConfig';
import { findCategoryByInput, normalizeCategoryLookupKey } from '../categoryLookup';
import { CATEGORY_MERGE_MAP, classifyToolText, resolvePrimarySlug } from '../categoryTaxonomy';

describe('categoryConfig', () => {
  it('keeps the primary category seed unique and configured', () => {
    const slugs = new Set(CATEGORY_SEED.map((category) => category.slug));
    const names = new Set(CATEGORY_SEED.map((category) => category.name));

    expect(CATEGORY_SEED).toHaveLength(PRIMARY_CATEGORIES.length);
    expect(getCategoryCount()).toBe(PRIMARY_CATEGORIES.length);
    expect(PRIMARY_CATEGORIES.length).toBeGreaterThanOrEqual(20);
    expect(PRIMARY_CATEGORIES.length).toBeLessThanOrEqual(30);
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
      { name: 'Pazarlama & SEO', slug: 'pazarlama' },
      { name: 'Görsel Üretim', slug: 'gorsel-uretim' },
      { name: 'Özel Kategori', slug: 'ozel-kategori' },
      { name: 'Kod & Geliştirici', slug: 'kod-yazilim' },
    ]);

    expect(sorted.map((category) => category.slug)).toEqual([
      'gorsel-uretim',
      'pazarlama',
      'kod-yazilim',
      'ozel-kategori',
    ]);
  });

  it('filters only primary categories', () => {
    const filtered = filterPrimaryCategories([
      { name: 'Görsel Üretim', slug: 'gorsel-uretim' },
      { name: 'Mikro', slug: 'thumbnail-kapak' },
      { name: 'Kod', slug: 'kod-yazilim' },
    ]);
    expect(filtered.map((c) => c.slug)).toEqual(['gorsel-uretim', 'kod-yazilim']);
  });

  it('matches categories by name, slug, alias and normalized user input', () => {
    const categories = [
      { id: '1', name: 'Görsel Üretim', slug: 'gorsel-uretim' },
      { id: '2', name: 'Kod & Geliştirici', slug: 'kod-yazilim' },
      { id: '3', name: 'Chatbot & Asistan', slug: 'chatbotlar' },
    ];

    expect(findCategoryByInput(categories, 'Görsel Üretim')?.id).toBe('1');
    expect(findCategoryByInput(categories, 'gorsel-uretim')?.id).toBe('1');
    expect(findCategoryByInput(categories, 'gorsel video')?.id).toBe('1');
    expect(findCategoryByInput(categories, 'fotograf-duzenleme')?.id).toBe('1');
    expect(findCategoryByInput(categories, 'multimodal-asistanlar')?.id).toBe('3');
    expect(findCategoryByInput(categories, 'Kod Yazilim')?.id).toBe('2');
    expect(normalizeCategoryLookupKey('  Görsel-&-Video  ')).toBe('gorsel ve video');
  });

  it('resolves merge map and classifies tool text', () => {
    expect(resolvePrimarySlug('verimlilik')).toBe('uretkenlik');
    expect(resolvePrimarySlug('tasarm')).toBe('tasarim');
    expect(CATEGORY_MERGE_MAP['metin-icerik']).toBe('metin-yazarligi');

    const midjourney = classifyToolText(
      'Midjourney',
      'Metinden sanatsal görseller üreten AI image generator',
      'https://midjourney.com'
    );
    expect(midjourney.slug).toBe('gorsel-uretim');

    const github = classifyToolText(
      'GitHub Copilot',
      'Kod yazmanı hızlandıran developer AI asistanı',
      'https://github.com/features/copilot'
    );
    expect(github.slug).toBe('kod-yazilim');
  });
});
