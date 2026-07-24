const NO_INFORMATION_ANSWERS = {
  tr: 'Platformumuzda bu soruyu yanıtlayacak doğrulanmış bilgi bulunmuyor.',
  en: 'There is no verified information on our platform that can answer this question.',
};

export const NO_INFORMATION_ANSWER = NO_INFORMATION_ANSWERS.tr;

export function noInformationAnswer(locale = 'tr') {
  return NO_INFORMATION_ANSWERS[locale] || NO_INFORMATION_ANSWERS.tr;
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
  const validSources = [...new Set(requestedIds)]
    .map((id) => allowed.get(String(id)))
    .filter(Boolean)
    .map((item) => ({
      id: `tool:${item.id}`,
      type: 'tool',
      title: item.name,
      url: `/${locale}/tool/${item.slug}`,
      pricing: item.pricing_model || item.pricing_type || null,
      slug: item.slug || null,
    }));

  if (modelResponse?.insufficientContext || !answer || validSources.length === 0) {
    return {
      answer: noInformationAnswer(locale),
      sources: [],
      grounded: false,
    };
  }

  return { answer: answer.slice(0, 2000), sources: validSources, grounded: true };
}
