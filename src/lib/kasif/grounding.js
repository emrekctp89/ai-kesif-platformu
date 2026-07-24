const NO_INFORMATION_ANSWERS = {
  tr: 'Platformumuzda bu soruyu yanıtlayacak doğrulanmış bilgi bulunmuyor.',
  en: 'There is no verified information on our platform that can answer this question.',
};

export const NO_INFORMATION_ANSWER = NO_INFORMATION_ANSWERS.tr;

const REASON_LABELS = {
  tr: {
    'direct-match': 'göreve uygun',
    'free-plan': 'ücretsiz/freemium',
    verified: 'doğrulanmış',
    featured: 'öne çıkan',
    'high-rated': 'yüksek puan',
  },
  en: {
    'direct-match': 'task match',
    'free-plan': 'free/freemium',
    verified: 'verified',
    featured: 'featured',
    'high-rated': 'highly rated',
  },
};

export function noInformationAnswer(locale = 'tr') {
  return NO_INFORMATION_ANSWERS[locale] || NO_INFORMATION_ANSWERS.tr;
}

export function formatSourceReasons(reasonCodes = [], locale = 'tr') {
  const labels = REASON_LABELS[locale] || REASON_LABELS.tr;
  return [...new Set(reasonCodes || [])]
    .map((code) => labels[code] || code)
    .filter(Boolean)
    .slice(0, 2);
}

export function groundModelResponse(modelResponse, records, locale = 'tr') {
  const answer = String(modelResponse?.answer || '').trim();

  // Meta / soft-landing yanıtlar katalog kaynağı gerektirmez.
  if (modelResponse?.meta && answer) {
    return {
      answer: answer.slice(0, 2000),
      sources: [],
      grounded: true,
      meta: true,
      metaKind: modelResponse.metaKind || modelResponse.intent?.meta || null,
      softLanding: Boolean(modelResponse.softLanding),
    };
  }

  const allowed = new Map(records.map((item) => [`tool:${item.id}`, item]));
  const requestedIds = Array.isArray(modelResponse?.sourceIds) ? modelResponse.sourceIds : [];
  const reasonMap =
    modelResponse?.sourceReasons && typeof modelResponse.sourceReasons === 'object'
      ? modelResponse.sourceReasons
      : {};

  const validSources = [...new Set(requestedIds)]
    .map((id) => allowed.get(String(id)))
    .filter(Boolean)
    .map((item) => {
      const rating = Number(item.average_rating);
      const sourceId = `tool:${item.id}`;
      const reasonCodes = reasonMap[sourceId] || reasonMap[item.id] || [];
      return {
        id: sourceId,
        type: 'tool',
        title: item.name,
        url: `/${locale}/tool/${item.slug}`,
        pricing: item.pricing_model || item.pricing_type || null,
        slug: item.slug || null,
        category: item.category?.name || item.category_name || null,
        rating: Number.isFinite(rating) && rating > 0 ? Number(rating.toFixed(1)) : null,
        reasons: formatSourceReasons(reasonCodes, locale),
      };
    });

  if (modelResponse?.insufficientContext || !answer || validSources.length === 0) {
    return {
      answer: noInformationAnswer(locale),
      sources: [],
      grounded: false,
    };
  }

  return { answer: answer.slice(0, 2000), sources: validSources, grounded: true };
}
