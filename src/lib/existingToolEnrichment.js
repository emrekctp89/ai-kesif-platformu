import { createAdminClient } from '@/utils/supabase/admin';
import { generateGeminiText } from '@/utils/gemini';
import {
  inferPlatformsFromLink,
  inferPricingModel,
  normalizeTextField,
  normalizeToolUrl,
} from '@/lib/toolQuality';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
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

function clampLimit(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isInteger(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

function normalizeList(value, maxItems = 5) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeTextField(item))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizePlatforms(value, link) {
  const platforms = Array.isArray(value)
    ? value.map((item) => normalizeTextField(item)).filter(Boolean)
    : [];
  const accepted = platforms.filter((platform) => ALLOWED_PLATFORMS.has(platform));

  if (accepted.length > 0) return [...new Set(accepted)].slice(0, 5);
  return inferPlatformsFromLink(link) || ['Web'];
}

function normalizePricing(value, description, link) {
  const normalized = normalizeTextField(value || '');
  if (normalized === 'Bilinmiyor') return null;
  if (ALLOWED_PRICING_MODELS.has(normalized)) return normalized;
  return inferPricingModel(description, link) || null;
}

function buildTechnicalDetails(enrichment) {
  const sections = [];
  const features = normalizeList(enrichment.features, 5);
  const useCases = normalizeList(enrichment.use_cases, 5);
  const targetUsers = normalizeList(enrichment.target_users, 4);
  const limitations = normalizeList(enrichment.limitations, 3);

  if (features.length > 0) {
    sections.push(`Öne çıkan özellikler:\n${features.map((item) => `- ${item}`).join('\n')}`);
  }
  if (useCases.length > 0) {
    sections.push(`Kullanım alanları:\n${useCases.map((item) => `- ${item}`).join('\n')}`);
  }
  if (targetUsers.length > 0) {
    sections.push(`Kimler için uygun:\n${targetUsers.map((item) => `- ${item}`).join('\n')}`);
  }
  if (limitations.length > 0) {
    sections.push(
      `Dikkat edilmesi gerekenler:\n${limitations.map((item) => `- ${item}`).join('\n')}`
    );
  }

  return sections.join('\n\n').slice(0, 1800) || null;
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

function getQualityScore(tool) {
  let score = 0;
  if (String(tool.description || '').trim().length >= 140) score += 2;
  if (tool.pricing_model) score += 1;
  if (Array.isArray(tool.platforms) && tool.platforms.length > 0) score += 1;
  if (String(tool.technical_details || '').trim().length >= 240) score += 4;
  if (String(tool.description_en || '').trim()) score += 1;
  return score;
}

function needsEnrichment(tool, { includeGoodQuality = false } = {}) {
  if (includeGoodQuality) return true;
  return getQualityScore(tool) < 7;
}

function buildPrompt(tool) {
  return `
AI Keşif Platformu'ndaki mevcut bir aracın eksik kart ve detay sayfası bilgilerini zenginleştir.

Amaç:
- Yeni araç keşif pipeline'ı ile aynı kalite seviyesinde Türkçe veri üret.
- Bilgi uydurma riskini azalt; emin olmadığın fiyat bilgisini boş bırak veya "Freemium" yerine doğru seç.
- Link resmi ürün sitesiyse, ürünün genel bilinen kullanım alanlarını özetle.
- Çıktı sadece geçerli JSON olsun.

Mevcut araç:
{
  "name": ${JSON.stringify(tool.name || '')},
  "link": ${JSON.stringify(tool.link || '')},
  "category": ${JSON.stringify(tool.category_name || tool.categories?.name || '')},
  "description": ${JSON.stringify(tool.description || '')},
  "pricing_model": ${JSON.stringify(tool.pricing_model || '')},
  "platforms": ${JSON.stringify(tool.platforms || [])},
  "technical_details": ${JSON.stringify(tool.technical_details || '')}
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

async function enrichToolWithGemini(tool) {
  const text = await generateGeminiText(buildPrompt(tool), {
    systemInstruction:
      'Sen AI araç dizini editörüsün. Kısa, doğru, Türkçe ve JSON uyumlu veri üretirsin.',
  });
  const parsed = parseJsonFromText(text);
  const normalizedLink = normalizeToolUrl(tool.link);
  const description = normalizeTextField(parsed.description || tool.description || '');
  const pricingModel = normalizePricing(parsed.pricing_model, description, normalizedLink);
  const platforms = normalizePlatforms(parsed.platforms, normalizedLink);
  const technicalDetails = buildTechnicalDetails(parsed);

  if (description.length < 80) {
    throw new Error('Zenginleştirme açıklaması çok kısa.');
  }

  return {
    description,
    pricing_model: pricingModel,
    platforms,
    technical_details: technicalDetails,
    detail_readiness: {
      feature_count: normalizeList(parsed.features, 5).length,
      use_case_count: normalizeList(parsed.use_cases, 5).length,
      target_user_count: normalizeList(parsed.target_users, 4).length,
      limitation_count: normalizeList(parsed.limitations, 3).length,
    },
  };
}

function buildUpdates(tool, enrichment) {
  const updates = {};
  const currentDescription = normalizeTextField(tool.description || '');
  const currentTechnicalDetails = normalizeTextField(tool.technical_details || '', {
    preserveNewLines: true,
  });

  if (
    enrichment.description &&
    enrichment.description !== currentDescription &&
    (currentDescription.length < 140 || enrichment.description.length > currentDescription.length)
  ) {
    updates.description = enrichment.description;
  }

  if (
    !tool.pricing_model &&
    enrichment.pricing_model &&
    enrichment.pricing_model !== 'Bilinmiyor'
  ) {
    updates.pricing_model = enrichment.pricing_model;
  }

  const currentPlatforms = Array.isArray(tool.platforms) ? tool.platforms.filter(Boolean) : [];
  const isWebOnly =
    currentPlatforms.length === 0 ||
    (currentPlatforms.length === 1 && currentPlatforms[0] === 'Web');
  if (
    enrichment.platforms?.length &&
    (isWebOnly || enrichment.platforms.length > currentPlatforms.length)
  ) {
    // Upgrade sparse/default Web-only metadata when enrichment has richer platforms
    const enriched = enrichment.platforms;
    const same =
      currentPlatforms.length === enriched.length &&
      currentPlatforms.every((p, i) => p === enriched[i]);
    if (!same) {
      updates.platforms = enrichment.platforms;
    }
  }

  if (
    enrichment.technical_details &&
    (!currentTechnicalDetails ||
      currentTechnicalDetails.length < enrichment.technical_details.length)
  ) {
    updates.technical_details = enrichment.technical_details;
  }

  return updates;
}

export async function enrichExistingTools(options = {}) {
  const dryRun = options.dryRun !== false;
  const limit = clampLimit(options.limit);
  const includeGoodQuality = Boolean(options.includeGoodQuality);
  const supabaseAdmin = createAdminClient();

  const { data: tools, error } = await supabaseAdmin
    .from('tools')
    .select(
      `
      id,
      name,
      slug,
      link,
      description,
      description_en,
      pricing_model,
      platforms,
      technical_details,
      updated_at,
      categories(name, slug)
    `
    )
    .eq('is_approved', true)
    .order('updated_at', { ascending: true })
    .limit(limit * 4);

  if (error) {
    throw new Error(`Araçlar okunamadı: ${error.message}`);
  }

  const candidates = (tools || [])
    .map((tool) => ({
      ...tool,
      category_name: tool.category_name || tool.categories?.name || null,
      quality_score: getQualityScore(tool),
    }))
    .filter((tool) => needsEnrichment(tool, { includeGoodQuality }))
    .slice(0, limit);

  const results = [];
  let updatedCount = 0;
  let failedCount = 0;
  const touchedSlugs = [];

  for (const tool of candidates) {
    try {
      const enrichment = await enrichToolWithGemini(tool);
      const updates = buildUpdates(tool, enrichment);

      const result = {
        id: tool.id,
        slug: tool.slug,
        name: tool.name,
        qualityScoreBefore: tool.quality_score,
        updates,
        detailReadiness: enrichment.detail_readiness,
      };

      if (!dryRun && Object.keys(updates).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('tools')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', tool.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        updatedCount += 1;
        if (tool.slug) touchedSlugs.push(tool.slug);
      }

      results.push(result);
    } catch (toolError) {
      failedCount += 1;
      results.push({
        id: tool.id,
        slug: tool.slug,
        name: tool.name,
        error: toolError instanceof Error ? toolError.message : 'Zenginleştirme hatası',
      });
    }
  }

  return {
    success: true,
    dryRun,
    scannedCount: tools?.length || 0,
    candidateCount: candidates.length,
    updatedCount,
    failedCount,
    touchedSlugs,
    results,
    ranAt: new Date().toISOString(),
  };
}
