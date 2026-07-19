import 'server-only';

import { answerQuestion, rankTools, understandConversation } from './engine';
import { groundModelResponse, NO_INFORMATION_ANSWER } from './grounding';
import { retrievePlatformContext } from './retrieval';
import { createClient } from '@/utils/supabase/actions';

function cleanText(value, fallback = '') {
  return String(value || fallback)
    .trim()
    .replace(/\s+/g, ' ');
}

function recommendationReason(record, reasons) {
  if (reasons.length) return `${reasons.join(', ')} olduğu için ihtiyacınıza uygun.`;
  return cleanText(record.description, 'Platformdaki özellikleri ihtiyacınızla eşleşiyor.').slice(
    0,
    220
  );
}

export async function getKasifRecommendations(question, history = [], limit = 3) {
  const records = await retrievePlatformContext(question, history);
  const intent = understandConversation(question, history);
  const ranked = rankTools(records, intent, limit);

  return {
    intent,
    recommendations: ranked.map(({ record, reasons }) => ({
      name: record.name,
      slug: record.slug,
      reason: recommendationReason(record, reasons),
    })),
  };
}

export async function getKasifAssistantAnswer(question, history = []) {
  const records = await retrievePlatformContext(question, history);
  if (!records.length) {
    return { spoken_response: NO_INFORMATION_ANSWER, suggested_content: [] };
  }

  const modelResponse = answerQuestion(question, records, history);
  const grounded = groundModelResponse(modelResponse, records);
  return {
    spoken_response: grounded.answer,
    suggested_content: grounded.sources.map((source) => ({
      type: 'Araç',
      title: source.title,
      url: source.url,
    })),
  };
}

function ratingOf(tool) {
  const rating = Number(tool.average_rating);
  return Number.isFinite(rating) && rating > 0 ? rating : null;
}

function comparisonPros(tool) {
  const pros = [];
  if (tool.pricing_model) pros.push(`Fiyat modeli: ${tool.pricing_model}`);
  const rating = ratingOf(tool);
  if (rating) pros.push(`Platform puanı ${rating.toFixed(1)}/5`);
  if (Array.isArray(tool.platforms) && tool.platforms.length) {
    pros.push(`Desteklenen platformlar: ${tool.platforms.slice(0, 4).join(', ')}`);
  }
  return pros.slice(0, 3);
}

function comparisonCons(tool) {
  const cons = [];
  if (!tool.pricing_model) cons.push('Fiyat bilgisi platform kaydında belirtilmemiş.');
  if (!ratingOf(tool) || Number(tool.total_ratings || 0) < 3) {
    cons.push('Karar vermek için kullanıcı puanı verisi sınırlı.');
  }
  if (!Array.isArray(tool.platforms) || !tool.platforms.length) {
    cons.push('Platform desteği kayıtta ayrıntılı belirtilmemiş.');
  }
  return cons.slice(0, 3);
}

export function compareToolsWithKasif(tools) {
  const normalized = (tools || []).filter((tool) => tool?.name);
  const rated = normalized
    .map((tool) => ({ tool, rating: ratingOf(tool) }))
    .filter(({ rating }) => rating)
    .sort((a, b) => b.rating - a.rating);
  const ratingSummary = rated.length
    ? ` Platform puanında ${rated[0].tool.name} ${rated[0].rating.toFixed(1)}/5 ile öne çıkıyor.`
    : '';

  return {
    comparison_summary: `${normalized.map((tool) => tool.name).join(', ')} yalnızca doğrulanmış platform kayıtlarına göre karşılaştırıldı.${ratingSummary}`,
    detailed_analysis: normalized.map((tool) => ({
      tool_name: tool.name,
      best_for: tool.category_name
        ? `${tool.category_name} alanında çözüm arayan kullanıcılar.`
        : cleanText(tool.description, 'Genel AI aracı ihtiyacı olan kullanıcılar.').slice(0, 180),
      pros: comparisonPros(tool),
      cons: comparisonCons(tool),
    })),
  };
}

export async function compareSelectedToolsWithKasif(toolSlugs) {
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
