import {
  buildCategoryLookupMap,
  findCategoryByInput,
  normalizeCategoryLookupKey,
} from '../categoryLookup';

describe('categoryLookup', () => {
  const categories = [
    { id: 1, name: 'Kod & Yazılım', slug: 'kod-yazilim' },
    { id: 2, name: 'Pazarlama', slug: 'pazarlama' },
  ];

  it('normalizes Turkish and separators', () => {
    expect(normalizeCategoryLookupKey('Kod-Yazılım')).toBe(
      normalizeCategoryLookupKey('kod yazilim')
    );
  });

  it('finds category by name or slug', () => {
    expect(findCategoryByInput(categories, 'pazarlama')?.slug).toBe('pazarlama');
    expect(findCategoryByInput(categories, 'Kod Yazilim')?.slug).toBe('kod-yazilim');
    expect(findCategoryByInput(categories, 'kod-yazilim')?.id).toBe(1);
  });

  it('builds a lookup map', () => {
    const map = buildCategoryLookupMap(categories);
    expect(map.size).toBeGreaterThan(2);
  });
});
