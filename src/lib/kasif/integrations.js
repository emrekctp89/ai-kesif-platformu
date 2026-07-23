import 'server-only';

import { answerQuestion, formatKasifReasons, rankTools, understandConversation } from './engine';
import { assertKasifEnabled } from './config';
import { groundModelResponse, NO_INFORMATION_ANSWER } from './grounding';
import { retrievePlatformContext } from './retrieval';
import { createClient } from '@/utils/supabase/actions';

function cleanText(value, fallback = '') {
  return String(value || fallback)
    .trim()
    .replace(/\s+/g, ' ');
}

function recommendationReason(record, reasons, locale = 'tr') {
  if (reasons.length) {
    const labels = formatKasifReasons(reasons, locale).join(', ');
    return locale === 'en'
      ? `A good fit because it is ${labels}.`
      : `${labels} olduğu için ihtiyacınıza uygun.`;
  }
  return cleanText(
    record.description,
    locale === 'en'
      ? 'Its platform features match your needs.'
      : 'Platformdaki özellikleri ihtiyacınızla eşleşiyor.'
  ).slice(0, 220);
}

function buildWorkmindQuestion(step) {
  return [step?.goal, step?.label, step?.description, step?.categorySlug]
    .map((value) => cleanText(value).replace(/[.?!,:;]+$/, ''))
    .filter(Boolean)
    .join('. ')
    .slice(0, 800);
}

export async function getKasifRecommendations(question, history = [], limit = 3, locale = 'tr') {
  assertKasifEnabled();
  const records = await retrievePlatformContext(question, history);
  const intent = understandConversation(question, history);
  const ranked = rankTools(records, intent, limit);

  return {
    intent,
    recommendations: ranked.map(({ record, reasons, score }) => ({
      name: record.name,
      slug: record.slug,
      reason: recommendationReason(record, reasons, locale),
      score,
    })),
  };
}

export async function getKasifWorkmindRecommendations(step, limit = 4, locale = 'tr') {
  assertKasifEnabled();
  const question = buildWorkmindQuestion(step);
  if (question.length < 3) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 4, 1), 6);
  const records = await retrievePlatformContext(question);
  const intent = understandConversation(question);
  const ranked = rankTools(records, intent, safeLimit);

  // Kategori ipucu varsa aynı kategoriyi hafifçe öne al (sıralamayı bozmadan).
  const categoryHint = cleanText(step?.categorySlug || step?.categoryName).toLocaleLowerCase(
    'tr-TR'
  );
  const ordered = categoryHint
    ? [...ranked].sort((a, b) => {
        const aHit = normalizeCategoryHit(a.record, categoryHint);
        const bHit = normalizeCategoryHit(b.record, categoryHint);
        if (aHit !== bHit) return bHit - aHit;
        return b.score - a.score;
      })
    : ranked;

  return ordered.map(({ record, reasons, score }) => ({
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: cleanText(record.description).slice(0, 220),
    tier: record.tier || null,
    pricing_model: record.pricing_model || null,
    platforms: Array.isArray(record.platforms) ? record.platforms.slice(0, 4) : [],
    kasifReason: recommendationReason(record, reasons, locale),
    score,
    goals: intent.goals,
  }));
}

function normalizeCategoryHit(record, categoryHint) {
  const categoryName = cleanText(record.category?.name).toLocaleLowerCase('tr-TR');
  if (!categoryHint || !categoryName) return 0;
  if (categoryName.includes(categoryHint) || categoryHint.includes(categoryName)) return 1;
  return 0;
}

export async function getKasifAssistantAnswer(question, history = [], locale = 'tr') {
  assertKasifEnabled();
  const records = await retrievePlatformContext(question, history);
  if (!records.length) {
    return {
      spoken_response:
        locale === 'en'
          ? 'There is no verified information on our platform that can answer this question.'
          : NO_INFORMATION_ANSWER,
      suggested_content: [],
    };
  }

  const modelResponse = answerQuestion(question, records, history, locale);
  const grounded = groundModelResponse(modelResponse, records, locale);
  return {
    spoken_response: grounded.answer,
    suggested_content: grounded.sources.map((source) => ({
      type: locale === 'en' ? 'Tool' : 'Araç',
      title: source.title,
      url: source.url,
    })),
    intent: modelResponse.intent,
    confidence: modelResponse.confidence,
  };
}

function ratingOf(tool) {
  const rating = Number(tool.average_rating);
  return Number.isFinite(rating) && rating > 0 ? rating : null;
}

export function compareToolsWithKasif(tools, locale = 'tr') {
  const normalized = (tools || []).filter((tool) => tool?.name);
  const rated = normalized
    .map((tool) => ({ tool, rating: ratingOf(tool) }))
    .filter(({ rating }) => rating)
    .sort((a, b) => b.rating - a.rating);

  const freeTools = normalized.filter((tool) =>
    /free|ucretsiz|freemium|acik kaynak|open.?source/i.test(String(tool.pricing_model || ''))
  );
  const names = normalized.map((tool) => tool.name).join(', ');

  const ratingSummary =
    rated.length > 0
      ? locale === 'en'
        ? ` On platform rating, ${rated[0].tool.name} leads at ${rated[0].rating.toFixed(1)}/5.`
        : ` Platform puanında ${rated[0].tool.name} ${rated[0].rating.toFixed(1)}/5 ile öne çıkıyor.`
      : '';

  const pricingSummary =
    freeTools.length > 0
      ? locale === 'en'
        ? ` Free/freemium options: ${freeTools.map((tool) => tool.name).join(', ')}.`
        : ` Ücretsiz/freemium seçenekler: ${freeTools.map((tool) => tool.name).join(', ')}.`
      : '';

  return {
    comparison_summary:
      locale === 'en'
        ? `${names} were compared using verified platform records only.${ratingSummary}${pricingSummary}`
        : `${names} yalnızca doğrulanmış platform kayıtlarına göre karşılaştırıldı.${ratingSummary}${pricingSummary}`,
    detailed_analysis: normalized.map((tool) => ({
      tool_name: tool.name,
      best_for: tool.category_name
        ? locale === 'en'
          ? `Users looking for solutions in ${tool.category_name}.`
          : `${tool.category_name} alanında çözüm arayan kullanıcılar.`
        : cleanText(
            tool.description,
            locale === 'en'
              ? 'Users who need a general AI tool.'
              : 'Genel AI aracı ihtiyacı olan kullanıcılar.'
          ).slice(0, 180),
      pros: comparisonPros(tool, locale),
      cons: comparisonCons(tool, locale),
    })),
  };
}

function comparisonPros(tool, locale = 'tr') {
  const pros = [];
  if (tool.pricing_model) {
    pros.push(
      locale === 'en'
        ? `Pricing model: ${tool.pricing_model}`
        : `Fiyat modeli: ${tool.pricing_model}`
    );
  }
  const rating = ratingOf(tool);
  if (rating) {
    pros.push(
      locale === 'en'
        ? `Platform rating ${rating.toFixed(1)}/5`
        : `Platform puanı ${rating.toFixed(1)}/5`
    );
  }
  if (Array.isArray(tool.platforms) && tool.platforms.length) {
    pros.push(
      locale === 'en'
        ? `Supported platforms: ${tool.platforms.slice(0, 4).join(', ')}`
        : `Desteklenen platformlar: ${tool.platforms.slice(0, 4).join(', ')}`
    );
  }
  return pros.slice(0, 3);
}

function comparisonCons(tool, locale = 'tr') {
  const cons = [];
  if (!tool.pricing_model) {
    cons.push(
      locale === 'en'
        ? 'Pricing is not specified in the platform record.'
        : 'Fiyat bilgisi platform kaydında belirtilmemiş.'
    );
  }
  if (!ratingOf(tool) || Number(tool.total_ratings || 0) < 3) {
    cons.push(
      locale === 'en'
        ? 'User rating data is limited for decision-making.'
        : 'Karar vermek için kullanıcı puanı verisi sınırlı.'
    );
  }
  if (!Array.isArray(tool.platforms) || !tool.platforms.length) {
    cons.push(
      locale === 'en'
        ? 'Platform support is not detailed in the record.'
        : 'Platform desteği kayıtta ayrıntılı belirtilmemiş.'
    );
  }
  return cons.slice(0, 3);
}

export async function compareSelectedToolsWithKasif(toolSlugs) {
  assertKasifEnabled();
  const slugs = [
    ...new Set((toolSlugs || []).map((slug) => cleanText(slug)).filter(Boolean)),
  ].slice(0, 4);
  if (slugs.length < 2) throw new Error('KASIF_COMPARISON_REQUIRES_TWO_TOOLS');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tools_with_ratings')
    .select(
      'name, slug, description, category_name, pricing_model, platforms, average_rating, total_ratings'
    )
    .in('slug', slugs)
    .eq('is_approved', true);
  if (error) throw new Error('KASIF_COMPARISON_RETRIEVAL_FAILED');

  const records = slugs.map((slug) => data?.find((tool) => tool.slug === slug)).filter(Boolean);
  if (records.length < 2) throw new Error('KASIF_COMPARISON_REQUIRES_TWO_TOOLS');
  return compareToolsWithKasif(records);
}
