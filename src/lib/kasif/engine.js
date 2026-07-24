import {
  buildRetrievalQuery,
  extractSearchTerms,
  includesNormalized,
  normalizeText,
} from './retrieval';
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

function pricingLabel(record, locale = 'tr') {
  const pricing = pricingOf(record);
  if (!pricing) return locale === 'en' ? 'Pricing not specified' : 'Fiyat belirtilmemiş';
  if (pricing === 'free' || pricing === 'ucretsiz') return locale === 'en' ? 'Free' : 'Ücretsiz';
  if (pricing === 'freemium') return 'Freemium';
  if (pricing === 'paid' || pricing === 'ucretli') return locale === 'en' ? 'Paid' : 'Ücretli';
  if (pricing === 'open source' || pricing === 'acik kaynak')
    return locale === 'en' ? 'Open source' : 'Açık kaynak';
  return record.pricing_type || record.pricing_model;
}

const SHARED_TOOL_HOSTS = new Set([
  'apps.apple.com',
  'chrome.google.com',
  'github.com',
  'huggingface.co',
  'play.google.com',
]);

const REASON_LABELS = {
  tr: {
    'direct-match': 'istenen göreve doğrudan uygun',
    'free-plan': 'ücretsiz veya ücretsiz planlı',
    verified: 'platformda doğrulanmış',
    featured: 'öne çıkarılmış',
    'high-rated': 'yüksek puanlı',
  },
  en: {
    'direct-match': 'direct match for the requested task',
    'free-plan': 'free or offers a free plan',
    verified: 'verified on the platform',
    featured: 'featured on the platform',
    'high-rated': 'highly rated',
  },
};

export function formatKasifReasons(reasons = [], locale = 'tr') {
  const labels = REASON_LABELS[locale] || REASON_LABELS.tr;
  return reasons.map((reason) => labels[reason] || reason);
}

function toolFamily(record) {
  try {
    const hostname = new URL(record.link).hostname.replace(/^www\./, '');
    return hostname && !SHARED_TOOL_HOSTS.has(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

function isPrimaryToolPage(record) {
  try {
    const pathname = new URL(record.link).pathname.replace(/\/+$/, '');
    return pathname === '';
  } catch {
    return false;
  }
}

export function understandQuestion(question) {
  const normalized = normalizeText(question);
  const freeMentioned = FREE_WORDS.some((word) => includesNormalized(normalized, word));
  const paidMentioned = PAID_WORDS.some((word) => includesNormalized(normalized, word));
  const rejectsFree =
    /ucretsiz (olmasin|istemiyorum)|bedava (olmasin|istemiyorum)|(?:do not|don t|dont) want (?:a )?free|not free/.test(
      normalized
    );
  const rejectsPaid =
    /ucretli (olmasin|istemiyorum)|para vermek istemiyorum|(?:do not|don t|dont) want (?:a )?paid|not paid|no paid|without (?:paying|a subscription)/.test(
      normalized
    );
  const matchedConcepts = Object.entries(KASIF_CONCEPTS)
    .map(([concept, words]) => ({
      concept,
      signals: words.filter((word) => includesNormalized(normalized, word)).map(normalizeText),
    }))
    .filter(({ signals }) => signals.length > 0);
  const concepts = matchedConcepts.map(({ concept }) => concept);
  const rawGoals = Object.entries(KASIF_GOALS)
    .filter(([, goal]) =>
      goal.queryGroups.every((group) => group.some((word) => includesNormalized(normalized, word)))
    )
    .map(([goal]) => goal);
  const goals = prioritizeGoals(rawGoals);
  return {
    tokens: extractSearchTerms(question),
    wantsFree: (freeMentioned && !rejectsFree) || rejectsPaid,
    wantsPaid: (paidMentioned && !rejectsPaid) || rejectsFree,
    wantsComparison:
      /karsilastir|farki|hangisi|alternatif|compare|comparison|difference|alternative|versus|\bvs\b/.test(
        normalized
      ),
    concepts,
    signals: matchedConcepts.flatMap(({ signals }) => signals),
    goals,
  };
}

/**
 * Daha spesifik hedefler genel olanların üzerine yazılır.
 * Örn. logo-design > image-generation, coding-assistant > learning-tutor.
 */
const GOAL_DOMINANCE = [
  ['logo-design', 'image-generation'],
  ['ui-design', 'image-generation'],
  ['three-d-generation', 'image-generation'],
  ['coding-assistant', 'learning-tutor'],
  ['coding-assistant', 'chatbot-assistant'],
  ['email-writing', 'content-writing'],
  ['ecommerce-copy', 'content-writing'],
  ['seo-optimization', 'data-analysis'],
  ['seo-optimization', 'content-writing'],
  ['customer-support', 'chatbot-assistant'],
  ['voice-generation', 'music-generation'],
  ['meeting-notes', 'voice-generation'],
];

export function prioritizeGoals(goals = []) {
  if (!Array.isArray(goals) || goals.length <= 1) return goals || [];
  let result = [...goals];
  for (const [winner, loser] of GOAL_DOMINANCE) {
    if (result.includes(winner) && result.includes(loser)) {
      result = result.filter((goal) => goal !== loser);
    }
  }
  return result;
}

export function understandConversation(question, history = []) {
  const currentIntent = understandQuestion(question);
  const contextualIntent = understandQuestion(buildRetrievalQuery(question, history));
  const currentHasPricePreference = currentIntent.wantsFree || currentIntent.wantsPaid;
  const currentHasTopic = currentIntent.concepts.length > 0;
  const currentHasGoal = currentIntent.goals.length > 0;

  return {
    ...contextualIntent,
    tokens: currentHasTopic ? currentIntent.tokens : contextualIntent.tokens,
    concepts: currentHasTopic ? currentIntent.concepts : contextualIntent.concepts,
    signals: currentHasTopic ? currentIntent.signals : contextualIntent.signals,
    goals: currentHasGoal ? currentIntent.goals : currentHasTopic ? [] : contextualIntent.goals,
    wantsFree: currentHasPricePreference ? currentIntent.wantsFree : contextualIntent.wantsFree,
    wantsPaid: currentHasPricePreference ? currentIntent.wantsPaid : contextualIntent.wantsPaid,
    wantsComparison: currentIntent.wantsComparison,
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
    if (includesNormalized(searchable, signal)) score += 6;
  }
  for (const goalName of intent.goals) {
    const goal = KASIF_GOALS[goalName];
    const evidenceMatches = goal.evidence.filter((phrase) =>
      includesNormalized(searchable, phrase)
    ).length;
    if (evidenceMatches > 0) {
      score += 10 + Math.min(evidenceMatches - 1, 2) * 3;
      reasons.push('direct-match');
    }
    const negativeMatches = (goal.negativeEvidence || []).filter((phrase) =>
      includesNormalized(searchable, phrase)
    ).length;
    score -= Math.min(negativeMatches, 2) * 16;
  }
  if (intent.wantsFree && isFreePricing(record)) {
    score += 7;
    reasons.push('free-plan');
  }
  if (intent.wantsPaid && /paid|ucretli|premium|enterprise/.test(pricing)) score += 4;
  if (record.is_verified) {
    score += 2;
    reasons.push('verified');
  }
  if (record.is_featured) {
    score += 2;
    reasons.push('featured');
  }
  if (isPrimaryToolPage(record)) score += 1;
  const rating = Number(record.average_rating);
  if (Number.isFinite(rating) && rating > 0) {
    score += Math.min(rating, 5) / 2;
    if (rating >= 4.5) reasons.push('high-rated');
  }
  return { record, score, reasons: [...new Set(reasons)] };
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
  const sorted = (preferred.length > 0 ? preferred : scored).sort(
    (a, b) => b.score - a.score || String(a.record.name).localeCompare(String(b.record.name), 'tr')
  );
  const families = new Set();
  const diverse = [];
  for (const item of sorted) {
    const family = toolFamily(item.record);
    if (family && families.has(family)) continue;
    if (family) families.add(family);
    diverse.push(item);
    if (diverse.length >= limit) break;
  }
  return diverse;
}

const META_PATTERNS = {
  identity: [
    /sen kimsin/,
    /kimsin/,
    /adin ne/,
    /adın ne/,
    /who are you/,
    /what are you/,
    /what is kasif/,
    /kasif nedir/,
    /kâşif nedir/,
  ],
  capabilities: [
    /ne yapabilirsin/,
    /neler yapabilirsin/,
    /neler yapabilir/,
    /nasil yardimci/,
    /nasıl yardımcı/,
    /what can you do/,
    /how can you help/,
    /hangi konularda/,
  ],
  how: [
    /nasil calisir/,
    /nasıl çalışır/,
    /nasil calisiyorsun/,
    /nasıl çalışıyorsun/,
    /how do you work/,
    /how does it work/,
    /hangi modeli/,
    /llm kullan/,
  ],
};

export function detectMetaIntent(question) {
  const normalized = normalizeText(question);
  if (!normalized || normalized.length < 3) return null;
  for (const [kind, patterns] of Object.entries(META_PATTERNS)) {
    if (
      patterns.some((pattern) => pattern.test(normalized) || pattern.test(String(question || '')))
    ) {
      return kind;
    }
  }
  return null;
}

function metaAnswers(kind, locale = 'tr') {
  const tr = {
    identity:
      'Ben Kâşif’im — AI Keşif Platformu’nun yerel öneri motoruyum. Dış bir sohbet modeline bağlı değilim; yalnızca platformdaki onaylı araç kayıtlarından öneri ve karşılaştırma üretirim.',
    capabilities:
      'Yapabileceklerim: ihtiyacına göre araç önermek, ücretsiz/ücretli tercihine göre sıralamak, birkaç aracı karşılaştırmak ve neden önerdiğimi platform verisiyle açıklamak. Örnek: “ücretsiz sunum aracı”, “SEO analizi”, “soğuk e-posta yaz”.',
    how: 'Şöyle çalışırım: sorunu Türkçe/İngilizce normalize ederim, kavram ve görev niyetini çıkarırım, onaylı araçları puanlarım ve cevabı yalnızca bu kayıtlardan üretirim. Genel bilgi sohbeti veya platform dışı web araması yapmam.',
  };
  const en = {
    identity:
      'I am Kâşif — the local recommendation engine of AI Keşif Platformu. I am not a general chatbot; I rank and compare only verified tools from this platform’s catalog.',
    capabilities:
      'I can recommend tools for a task, filter free vs paid options, compare tools, and explain matches using platform data. Examples: “free presentation tool”, “SEO analysis”, “cold email writing”.',
    how: 'I normalize your question, detect task intent, score approved tools, and answer only from those records. I do not browse the open web or invent tools outside the catalog.',
  };
  const pack = locale === 'en' ? en : tr;
  return pack[kind] || pack.identity;
}

/**
 * "Sen kimsin?", "Ne yapabilirsin?" gibi meta sorulara katalog aramadan sabit yanıt.
 */
export function answerMetaQuestion(question, locale = 'tr') {
  const kind = detectMetaIntent(question);
  if (!kind) return null;
  return {
    answer: metaAnswers(kind, locale),
    sourceIds: [],
    insufficientContext: false,
    confidence: 0.99,
    meta: true,
    metaKind: kind,
    intent: {
      concepts: [],
      goals: [],
      pricePreference: 'any',
      comparison: false,
      meta: kind,
    },
  };
}

const CONTEXTLESS_FOLLOW_UP =
  /^(peki|peki ya|ok|tamam|ya)\b|bunlardan|hangileri|oncekiler|yukaridakiler|onerdigin|onerdiklerin|which of these|of these|the ones you|those ones|listed above|you (recommended|suggested)|from (those|them)|which ones/;

/**
 * Konuşma geçmişi yokken "Peki bunlardan ücretsiz olanlar hangileri?" gibi
 * referanslı follow-up'ları yakalar; zayıf katalog araması yerine soft-landing üretir.
 */
export function isContextlessFollowUp(question, history = []) {
  const hasUserHistory = (history || []).some(
    (message) => message?.role === 'user' && String(message.content || '').trim()
  );
  if (hasUserHistory) return false;

  const intent = understandQuestion(question);
  // Açık görev/konu varsa normal motor devam etsin.
  if (intent.goals.length > 0 || intent.concepts.length > 0) return false;

  const normalized = normalizeText(question);
  if (!normalized) return false;

  if (CONTEXTLESS_FOLLOW_UP.test(normalized)) return true;

  // Yalnızca fiyat + belirsiz seçim ifadesi
  if (
    (intent.wantsFree || intent.wantsPaid) &&
    /hangileri|olanlar|secenek|which|ones|options|filter|filtre/.test(normalized)
  ) {
    return true;
  }

  return false;
}

export function answerContextlessFollowUp(question, locale = 'tr', history = []) {
  if (!isContextlessFollowUp(question, history)) return null;

  const intent = understandQuestion(question);
  const priceNote =
    locale === 'en'
      ? intent.wantsFree
        ? ' I can still prefer free/freemium options once the task is clear.'
        : intent.wantsPaid
          ? ' I can still prefer paid options once the task is clear.'
          : ''
      : intent.wantsFree
        ? ' Görevi netleştirince ücretsiz/freemium tercihine göre sıralayabilirim.'
        : intent.wantsPaid
          ? ' Görevi netleştirince ücretli tercihine göre sıralayabilirim.'
          : '';

  const answer =
    locale === 'en'
      ? `I don’t have the previous recommendation list in this message, so I can’t filter “those” tools yet.${priceNote}

Please restate the task in one sentence, for example:
• Free presentation tools
• SEO analysis tools
• Cold email writing assistants

Then I can rank verified platform tools for you.`
      : `Bu mesajda önceki öneri listesi yok; bu yüzden “bunlardan hangileri?” sorusunu güvenle daraltamıyorum.${priceNote}

Görevi tek cümlede yeniden yazman yeterli. Örnek:
• Ücretsiz sunum aracı öner
• SEO analizi araçları
• Soğuk e-posta yazma asistanı

Böylece platformdaki onaylı araçları senin için sıralayabilirim.`;

  return {
    answer,
    sourceIds: [],
    insufficientContext: false,
    confidence: 0.92,
    meta: true,
    metaKind: 'soft-landing',
    softLanding: true,
    intent: {
      concepts: [],
      goals: [],
      pricePreference: intent.wantsFree ? 'free' : intent.wantsPaid ? 'paid' : 'any',
      comparison: intent.wantsComparison,
      meta: 'soft-landing',
    },
  };
}

export function answerQuestion(question, records, history = [], locale = 'tr') {
  const meta = answerMetaQuestion(question, locale);
  if (meta) return meta;

  if (isContextlessFollowUp(question, history)) {
    return answerContextlessFollowUp(question, locale);
  }

  const intent = understandConversation(question, history);
  const ranked = rankTools(records, intent, intent.wantsComparison ? 4 : 5);
  if (!ranked.length) {
    return { answer: '', sourceIds: [], insufficientContext: true, confidence: 0, intent };
  }
  const priceHint =
    locale === 'en'
      ? intent.wantsFree
        ? ' (preferring free or freemium options)'
        : intent.wantsPaid
          ? ' (preferring paid options)'
          : ''
      : intent.wantsFree
        ? ' (ücretsiz/freemium tercihine göre)'
        : intent.wantsPaid
          ? ' (ücretli tercihine göre)'
          : '';
  const intro =
    locale === 'en'
      ? intent.wantsComparison
        ? `I compared the strongest options for your needs${priceHint}:`
        : `Based on platform data, these tools best match your needs${priceHint}:`
      : intent.wantsComparison
        ? `İhtiyacına göre öne çıkan seçenekleri karşılaştırdım${priceHint}:`
        : `Platform verilerine göre ihtiyacına en yakın araçlar şunlar${priceHint}:`;
  const lines = ranked.map(({ record, reasons }, index) => {
    const detail = String(record.description || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 170);
    const why = reasons.length ? ` (${formatKasifReasons(reasons, locale).join(', ')})` : '';
    if (intent.wantsComparison) {
      const category =
        record.category?.name ||
        (locale === 'en' ? 'Category not specified' : 'Kategori belirtilmemiş');
      const pricing = pricingLabel(record, locale);
      return `${index + 1}. ${record.name} — ${category} · ${pricing}${why}${detail ? `\n${detail}` : ''}`;
    }
    return `${index + 1}. ${record.name}${why}${detail ? `: ${detail}` : ''}`;
  });
  const topScore = ranked[0].score;
  // Skor tabanlı güven + niyet netliği için taban (eski düşük güven gürültüsünü azaltır).
  let confidence = Math.min(0.98, Number((topScore / 30).toFixed(2)));
  if (intent.goals.length > 0) confidence = Math.max(confidence, 0.72);
  if (intent.goals.length > 0 && (intent.wantsFree || intent.wantsPaid)) {
    confidence = Math.max(confidence, 0.78);
  }
  if (ranked[0].reasons?.includes('direct-match')) {
    confidence = Math.max(confidence, 0.8);
  }
  confidence = Math.min(0.98, Number(confidence.toFixed(2)));

  return {
    answer: `${intro}\n\n${lines.join('\n')}\n\n${
      locale === 'en'
        ? 'Results were calculated exclusively from AI Keşif Platformu records.'
        : 'Sonuçlar yalnızca AI Keşif Platformu kayıtlarından hesaplandı.'
    }`,
    sourceIds: ranked.map(({ record }) => `tool:${record.id}`),
    insufficientContext: false,
    confidence,
    intent: {
      concepts: intent.concepts,
      goals: intent.goals,
      pricePreference: intent.wantsFree ? 'free' : intent.wantsPaid ? 'paid' : 'any',
      comparison: intent.wantsComparison,
    },
  };
}
