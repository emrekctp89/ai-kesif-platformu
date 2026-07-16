/**
 * Kategori adı/slug eşlemesi — discovery, seed ve arama için ortak yardımcı.
 */

export function normalizeCategoryLookupKey(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ı', 'i')
    .replaceAll('i\u0307', 'i') // i + combining dot
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' ve ')
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .replace(/[-\s]+/g, ' ')
    .trim();
}

function getCategoryLookupKeys(category) {
  return [
    category.name,
    category.slug,
    String(category.slug || '').replace(/-/g, ' '),
    String(category.name || '').replace(/&/g, 've'),
  ];
}

export function addCategoryLookupKeys(map, category) {
  for (const key of getCategoryLookupKeys(category)) {
    const normalized = normalizeCategoryLookupKey(key);
    if (normalized && !map.has(normalized)) {
      map.set(normalized, category);
    }
  }
}

export function buildCategoryLookupMap(categories = []) {
  const map = new Map();

  for (const category of categories) {
    addCategoryLookupKeys(map, category);
  }

  return map;
}

export function findCategoryByInput(categories, value) {
  if (!value) return null;
  return buildCategoryLookupMap(categories).get(normalizeCategoryLookupKey(value)) || null;
}
