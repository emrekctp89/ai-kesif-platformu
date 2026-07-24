/**
 * Scrape adayını (opsiyonel) Gemini ile zenginleştirir.
 * Mevcut existingToolEnrichment şemasına yakın, ama insert öncesi aday üzerine yazar.
 */

import { generateGeminiText } from '@/utils/gemini';
import {
  inferPlatformsFromLink,
  inferPricingModel,
  isLikelyEnglishDescription,
  normalizeTextField,
} from '@/lib/toolQuality';

const ALLOWED_PRICING_MODELS = new Set(['Ücretsiz', 'Freemium', 'Abonelik', 'Tek Seferlik Ödeme']);
const ALLOWED_PLATFORMS = new Set([
  'Web',
  'iOS',
  'Android',
  'Windows',
  'macOS',
  'Linux',
  'Chrome Uzantısı',
]);

function normalizeList(value, maxItems = 5) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeTextField(item))
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseJsonFromText(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || raw;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Gemini JSON formatında yanıt vermedi.');
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

function normalizePricing(value, description, link) {
  const normalized = normalizeTextField(value || '');
  if (!normalized || normalized === 'Bilinmiyor') {
    return inferPricingModel(description, link) || null;
  }
  if (ALLOWED_PRICING_MODELS.has(normalized)) return normalized;
  return inferPricingModel(description, link) || null;
}

function normalizePlatforms(value, link) {
  const platforms = Array.isArray(value)
    ? value.map((item) => normalizeTextField(item)).filter(Boolean)
    : [];
  const accepted = platforms.filter((platform) => ALLOWED_PLATFORMS.has(platform));
  if (accepted.length > 0) return [...new Set(accepted)].slice(0, 5);
  return inferPlatformsFromLink(link) || ['Web'];
}

function buildPrompt(candidate, categoryName) {
  return `
AI Keşif Platformu için scrape edilmiş bir araç adayını zenginleştir.

Amaç:
- Ham scrape alanlarını Türkçe, katalog kalitesinde kart verisine çevir.
- Bilgi uydurma; emin olmadığın fiyatı "Freemium" diye zorlama, doğru seç veya Freemium bırak.
- Link resmi ürün sitesiyse genel bilinen kullanımı özetle.
- Çıktı sadece geçerli JSON olsun.

Aday:
{
  "name": ${JSON.stringify(candidate.name || '')},
  "link": ${JSON.stringify(candidate.link || '')},
  "category": ${JSON.stringify(categoryName || candidate.category || '')},
  "description": ${JSON.stringify(candidate.description || '')},
  "pricing_model": ${JSON.stringify(candidate.pricing_model || '')},
  "platforms": ${JSON.stringify(candidate.platforms || [])},
  "features": ${JSON.stringify(candidate.features || [])},
  "use_cases": ${JSON.stringify(candidate.use_cases || [])}
}

JSON şeması:
{
  "description": "120-320 karakter arası, Türkçe, net ve kartta kullanılabilir açıklama",
  "pricing_model": "Ücretsiz | Freemium | Abonelik | Tek Seferlik Ödeme",
  "platforms": ["Web | iOS | Android | Windows | macOS | Linux | Chrome Uzantısı"],
  "features": ["3-5 temel özellik"],
  "use_cases": ["3-5 kullanım senaryosu"],
  "target_users": ["1-4 hedef kullanıcı grubu"],
  "limitations": ["0-3 dikkat edilmesi gereken nokta"]
}
`.trim();
}

/**
 * Gemini çıktısını aday üzerine güvenli şekilde birleştirir (saf, test edilebilir).
 * @param {object} candidate
 * @param {object} enrichment
 */
export function mergeEnrichedCandidate(candidate, enrichment) {
  const base = candidate && typeof candidate === 'object' ? { ...candidate } : {};
  const link = base.link || '';
  const currentDescription = normalizeTextField(base.description || '');
  const nextDescription = normalizeTextField(enrichment?.description || '');

  let description = currentDescription;
  if (nextDescription.length >= 80) {
    if (
      !currentDescription ||
      currentDescription.length < 120 ||
      isLikelyEnglishDescription(currentDescription) ||
      nextDescription.length > currentDescription.length + 10
    ) {
      description = nextDescription.slice(0, 600);
    }
  }

  const features = normalizeList(enrichment?.features, 5);
  const useCases = normalizeList(enrichment?.use_cases, 5);
  const targetUsers = normalizeList(enrichment?.target_users, 4);
  const limitations = normalizeList(enrichment?.limitations, 3);

  const pricing =
    normalizePricing(enrichment?.pricing_model, description, link) ||
    base.pricing_model ||
    'Freemium';

  const platforms = normalizePlatforms(enrichment?.platforms, link);

  return {
    ...base,
    description,
    pricing_model: pricing,
    platforms,
    features: features.length >= 2 ? features : base.features || features,
    use_cases: useCases.length >= 2 ? useCases : base.use_cases || useCases,
    target_users: targetUsers.length > 0 ? targetUsers : base.target_users || targetUsers,
    limitations:
      limitations.length > 0
        ? limitations
        : base.limitations || ['Scrape + Gemini verisi admin incelemesi gerektirir.'],
    source_reason: base.source_reason
      ? `${base.source_reason} · Gemini enrich`
      : 'URL scrape · Gemini enrich',
    enriched: true,
  };
}

/**
 * @param {object} candidate
 * @param {{ categoryName?: string }} [options]
 * @returns {Promise<{ candidate: object, enriched: boolean, error?: string }>}
 */
export async function enrichScrapeCandidate(candidate, options = {}) {
  if (!candidate || typeof candidate !== 'object') {
    return { candidate, enriched: false, error: 'Aday yok.' };
  }

  try {
    const text = await generateGeminiText(buildPrompt(candidate, options.categoryName), {
      systemInstruction:
        'Sen AI araç dizini editörüsün. Kısa, doğru, Türkçe ve JSON uyumlu veri üretirsin.',
    });
    const parsed = parseJsonFromText(text);
    const merged = mergeEnrichedCandidate(candidate, parsed);
    if (String(merged.description || '').length < 80) {
      return {
        candidate,
        enriched: false,
        error: 'Zenginleştirme açıklaması çok kısa; ham aday korundu.',
      };
    }
    return { candidate: merged, enriched: true };
  } catch (error) {
    return {
      candidate,
      enriched: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
