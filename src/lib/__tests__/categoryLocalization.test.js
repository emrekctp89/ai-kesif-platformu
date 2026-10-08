import { PRIMARY_CATEGORIES } from '@/lib/categoryTaxonomy';
import { getCategoryLabel, ENGLISH_CATEGORIES } from '@/lib/categoryLocalization';
import { getCategoryConfig } from '@/lib/categoryConfig';

it('provides English names and descriptions for every primary category', () => {
  for (const category of PRIMARY_CATEGORIES) {
    expect(ENGLISH_CATEGORIES[category.slug]?.name).toBeTruthy();
    expect(ENGLISH_CATEGORIES[category.slug]?.description).toBeTruthy();
    expect(getCategoryLabel(category, 'en')).toBe(ENGLISH_CATEGORIES[category.slug].name);
    expect(getCategoryConfig(category.slug, 'en').description).toBe(
      ENGLISH_CATEGORIES[category.slug].description
    );
    expect(getCategoryLabel(category, 'tr')).toBe(category.name);
  }
});

it('translates tool category names even when their slug is missing', () => {
  expect(getCategoryLabel({ category_name: 'Görsel Üretim' }, 'en')).toBe('Image Generation');
  expect(
    getCategoryLabel({ category_slug: 'kod-yazilim', category_name: 'Kod & Geliştirici' }, 'en')
  ).toBe('Coding & Development');
});

it('preserves explicit translations and unknown custom categories', () => {
  expect(getCategoryLabel({ name: 'Özel kategori', name_en: 'Custom category' }, 'en')).toBe(
    'Custom category'
  );
  expect(getCategoryLabel({ name: 'Custom', slug: 'custom' }, 'en')).toBe('Custom');
  expect(getCategoryLabel({ name: 'Diğer', slug: 'diger' }, 'en')).toBe('Other');
});

it('keeps tool names separate from category translations in both languages', () => {
  const tool = {
    name: 'Midjourney',
    name_en: 'Midjourney',
    category_name: 'Görsel Üretim',
    category_slug: 'gorsel-uretim',
  };
  expect(getCategoryLabel(tool, 'tr')).toBe('Görsel Üretim');
  expect(getCategoryLabel(tool, 'en')).toBe('Image Generation');
});

it('uses category_slug rather than the tool own slug', () => {
  expect(
    getCategoryLabel(
      {
        name: 'Tool',
        slug: 'tool-slug',
        category_slug: 'gorsel-uretim',
        category_name: 'Legacy name',
      },
      'en'
    )
  ).toBe('Image Generation');
});
