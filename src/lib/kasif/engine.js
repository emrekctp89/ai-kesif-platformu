import { extractSearchTerms, normalizeText } from './retrieval';
import { FREE_WORDS, KASIF_CONCEPTS, KASIF_GOALS, PAID_WORDS } from './lexicon';

function pricingOf(record) {
  return normalizeText(record.pricing_type || record.pricing_model || '');
}

function isFreePricing(record) {
  return /free|ucretsiz|freemium|acik kaynak/.test(pricingOf(record));
}

function isPaidPricing(record) {
  return /paid|ucretli|premium|enterprise/.test(pricingOf(record));
}

function pricingLabel(record) {
  const pricing = pricingOf(record);
  if (!pricing) return 'Fiyat belirtilmemiş';
  if (pricing === 'free' || pricing === 'ucretsiz') return 'Ücretsiz';
  if (pricing === 'freemium') return 'Freemium';
  if (pricing === 'paid' || pricing === 'ucretli') return 'Ücretli';
  if (pricing === 'open source' || pricing === 'acik kaynak') return 'Açık kaynak';
  return record.pricing_type || record.pricing_model;
}

export function understandQuestion(question) {
  const normalized = normalizeText(question);
  const freeMentioned = FREE_WORDS.map(normalizeText).some((word) => normalized.includes(word));
  const paidMentioned = PAID_WORDS.map(normalizeText).some((word) => normalized.includes(word));
  const rejectsFree = /ucretsiz (olmasin|istemiyorum)|bedava (olmasin|istemiyorum)/.test(
    normalized
  );
  const rejectsPaid = /ucretli (olmasin|istemiyorum)|para vermek istemiyorum/.test(normalized);
  const matchedConcepts = Object.entries(KASIF_CONCEPTS)
    .map(([concept, words]) => ({
      concept,
      signals: words.map(normalizeText).filter((word) => normalized.includes(word)),
    }))
    .filter(({ signals }) => signals.length > 0);
  const concepts = matchedConcepts.map(({ concept }) => concept);
  const goals = Object.entries(KASIF_GOALS)
    .filter(([, goal]) =>
      goal.queryGroups.every((group) =>
        group.some((word) => normalized.includes(normalizeText(word)))
      )
    )
    .map(([goal]) => goal);
  return {
    tokens: extractSearchTerms(question),
    wantsFree: (freeMentioned && !rejectsFree) || rejectsPaid,
    wantsPaid: (paidMentioned && !rejectsPaid) || rejectsFree,
    wantsComparison: /karsilastir|farki|hangisi|alternatif/.test(normalized),
    concepts,
    signals: matchedConcepts.flatMap(({ signals }) => signals),
    goals,
  };
}

export function scoreTool(record, intent) {
  const name = normalizeText(record.name);
  const description = normalizeText(record.description);
  const category = normalizeText(record.category?.name);
  const pricing = pricingOf(record);
  const searchable = `${name} ${description} ${category}`;
  let score = 0;
  const reasons = [];
  for (const token of intent.tokens) {
    if (name.includes(token)) score += 8;
    if (category.includes(token)) score += 5;
    if (description.includes(token)) score += 2;
  }
  for (const signal of intent.signals) {
    if (searchable.includes(signal)) score += 6;
  }
  for (const goalName of intent.goals) {
    const evidence = KASIF_GOALS[goalName].evidence.map(normalizeText);
    const evidenceMatches = evidence.filter((phrase) => searchable.includes(phrase)).length;
    if (evidenceMatches > 0) {
      score += 10 + Math.min(evidenceMatches - 1, 2) * 3;
      reasons.push('istenen göreve doğrudan uygun');
    }
  }
  if (intent.wantsFree && isFreePricing(record)) {
    score += 7;
    reasons.push('ücretsiz veya ücretsiz planlı');
  }
  if (intent.wantsPaid && /paid|ucretli|premium|enterprise/.test(pricing)) score += 4;
  if (record.is_verified) {
    score += 2;
    reasons.push('platformda doğrulanmış');
  }
  const rating = Number(record.average_rating);
  if (Number.isFinite(rating) && rating > 0) score += Math.min(rating, 5) / 2;
  return { record, score, reasons };
}

export function rankTools(records, intent, limit = 5) {
  const scored = records
    .map((record) => scoreTool(record, intent))
    .filter((item) => item.score > 0);
  const preferred = intent.wantsFree
    ? scored.filter(({ record }) => isFreePricing(record))
    : intent.wantsPaid
      ? scored.filter(({ record }) => isPaidPricing(record))
      : scored;
  return (preferred.length > 0 ? preferred : scored)
    .sort(
      (a, b) =>
        b.score - a.score || String(a.record.name).localeCompare(String(b.record.name), 'tr')
    )
    .slice(0, limit);
}

export function answerQuestion(question, records) {
  const intent = understandQuestion(question);
  const ranked = rankTools(records, intent, intent.wantsComparison ? 4 : 5);
  if (!ranked.length) {
    return { answer: '', sourceIds: [], insufficientContext: true, confidence: 0, intent };
  }
  const intro = intent.wantsComparison
    ? 'İhtiyacına göre öne çıkan seçenekleri karşılaştırdım:'
    : 'Platform verilerine göre ihtiyacına en yakın araçlar şunlar:';
  const lines = ranked.map(({ record, reasons }, index) => {
    const detail = String(record.description || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 170);
    const why = reasons.length ? ` (${reasons.join(', ')})` : '';
    if (intent.wantsComparison) {
      const category = record.category?.name || 'Kategori belirtilmemiş';
      const pricing = pricingLabel(record);
      return `${index + 1}. ${record.name} — ${category} · ${pricing}${why}${detail ? `\n${detail}` : ''}`;
    }
    return `${index + 1}. ${record.name}${why}${detail ? `: ${detail}` : ''}`;
  });
  return {
    answer: `${intro}\n\n${lines.join('\n')}\n\nSonuçlar yalnızca AI Keşif Platformu kayıtlarından hesaplandı.`,
    sourceIds: ranked.map(({ record }) => `tool:${record.id}`),
    insufficientContext: false,
    confidence: Math.min(0.98, Number((ranked[0].score / 30).toFixed(2))),
    intent: {
      concepts: intent.concepts,
      goals: intent.goals,
      pricePreference: intent.wantsFree ? 'free' : intent.wantsPaid ? 'paid' : 'any',
      comparison: intent.wantsComparison,
    },
  };
}
