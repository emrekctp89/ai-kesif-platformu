/**
 * Kategori bazlı seed ürün URL listeleri (resmî siteler).
 * Admin seed kuyruğu ve ileride cron (P3) buradan beslenir.
 *
 * Not: dizin/aggregator hostları toolLinkPolicy ile zaten engellenir;
 * buraya yalnızca ürün ana sayfaları koyulur.
 */

/**
 * @typedef {{ url: string, name?: string, categorySlug: string }} SeedEntry
 */

/** @type {Record<string, Array<{ url: string, name?: string }>>} */
export const SEED_URLS_BY_CATEGORY = {
  'gorsel-uretim': [
    { url: 'https://www.midjourney.com/', name: 'Midjourney' },
    { url: 'https://leonardo.ai/', name: 'Leonardo AI' },
    { url: 'https://www.ideogram.ai/', name: 'Ideogram' },
  ],
  'video-uretim': [
    { url: 'https://runwayml.com/', name: 'Runway' },
    { url: 'https://pika.art/', name: 'Pika' },
    { url: 'https://lumalabs.ai/dream-machine', name: 'Luma Dream Machine' },
  ],
  'ses-muzik': [
    { url: 'https://suno.com/', name: 'Suno' },
    { url: 'https://www.udio.com/', name: 'Udio' },
    { url: 'https://elevenlabs.io/', name: 'ElevenLabs' },
  ],
  'metin-yazarligi': [
    { url: 'https://jasper.ai/', name: 'Jasper' },
    { url: 'https://www.copy.ai/', name: 'Copy.ai' },
    { url: 'https://rytr.me/', name: 'Rytr' },
  ],
  'kod-yazilim': [
    { url: 'https://cursor.com/', name: 'Cursor' },
    { url: 'https://github.com/features/copilot', name: 'GitHub Copilot' },
    { url: 'https://replit.com/ai', name: 'Replit AI' },
  ],
  chatbotlar: [
    { url: 'https://claude.ai/', name: 'Claude' },
    { url: 'https://chat.openai.com/', name: 'ChatGPT' },
    { url: 'https://gemini.google.com/', name: 'Gemini' },
  ],
  uretkenlik: [
    { url: 'https://www.notion.so/product/ai', name: 'Notion AI' },
    { url: 'https://www.mem.ai/', name: 'Mem' },
    { url: 'https://otter.ai/', name: 'Otter.ai' },
  ],
  'otomasyon-ajan': [
    { url: 'https://www.zapier.com/ai', name: 'Zapier AI' },
    { url: 'https://n8n.io/', name: 'n8n' },
    { url: 'https://www.make.com/', name: 'Make' },
  ],
  tasarim: [
    { url: 'https://www.canva.com/magic/', name: 'Canva Magic Studio' },
    { url: 'https://www.figma.com/ai/', name: 'Figma AI' },
    { url: 'https://galileo.ai/', name: 'Galileo AI' },
  ],
  general: [
    { url: 'https://perplexity.ai/', name: 'Perplexity' },
    { url: 'https://www.phind.com/', name: 'Phind' },
    { url: 'https://you.com/', name: 'You.com' },
  ],
};

/**
 * Kayıtlı seed kategori slug'ları (+ general).
 */
export function listSeedCategorySlugs() {
  return Object.keys(SEED_URLS_BY_CATEGORY).sort((a, b) => a.localeCompare(b, 'tr'));
}

/**
 * @param {string} [categorySlug] boş veya "all" → tüm kategoriler
 * @param {{ includeGeneral?: boolean }} [options]
 * @returns {SeedEntry[]}
 */
export function getSeedEntries(categorySlug, options = {}) {
  const includeGeneral = options.includeGeneral !== false;
  const slug = String(categorySlug || '')
    .trim()
    .toLowerCase();
  const entries = [];

  const pushCategory = (key) => {
    const list = SEED_URLS_BY_CATEGORY[key] || [];
    for (const item of list) {
      if (!item?.url) continue;
      entries.push({
        url: item.url,
        name: item.name || undefined,
        categorySlug: key === 'general' ? 'general' : key,
      });
    }
  };

  if (!slug || slug === 'all') {
    for (const key of Object.keys(SEED_URLS_BY_CATEGORY)) {
      if (key === 'general' && !includeGeneral) continue;
      pushCategory(key);
    }
    return entries;
  }

  if (SEED_URLS_BY_CATEGORY[slug]) {
    pushCategory(slug);
  } else if (includeGeneral) {
    pushCategory('general');
  }

  return entries;
}

/**
 * Kategori slug → seed sayısı özeti (admin UI).
 */
export function summarizeSeedCatalog() {
  return listSeedCategorySlugs().map((slug) => ({
    slug,
    count: (SEED_URLS_BY_CATEGORY[slug] || []).length,
  }));
}
