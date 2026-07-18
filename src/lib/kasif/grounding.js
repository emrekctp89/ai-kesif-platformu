export const NO_INFORMATION_ANSWER =
  'Platformumuzda bu soruyu yanıtlayacak doğrulanmış bilgi bulunmuyor.';

export function groundModelResponse(modelResponse, records) {
  const allowed = new Map(records.map((item) => [`tool:${item.id}`, item]));
  const requestedIds = Array.isArray(modelResponse?.sourceIds) ? modelResponse.sourceIds : [];
  const validSources = [...new Set(requestedIds)]
    .map((id) => allowed.get(String(id)))
    .filter(Boolean)
    .map((item) => ({
      id: `tool:${item.id}`,
      type: 'tool',
      title: item.name,
      url: `/tool/${item.slug}`,
    }));

  const answer = String(modelResponse?.answer || '').trim();
  if (modelResponse?.insufficientContext || !answer || validSources.length === 0) {
    return {
      answer: NO_INFORMATION_ANSWER,
      sources: [],
      grounded: false,
    };
  }

  return { answer: answer.slice(0, 2000), sources: validSources, grounded: true };
}
