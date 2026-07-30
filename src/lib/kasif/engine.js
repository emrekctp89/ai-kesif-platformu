import {
  buildRetrievalQuery,
  extractSearchTerms,
  includesNormalized,
  includesNormalizedConcept,
  normalizeText,
} from './retrieval';
import { FREE_WORDS, KASIF_CONCEPTS, KASIF_GOALS, PAID_WORDS } from './lexicon';
import {
  buildSoftLandingAnswer,
  listSoftLandingStarters,
  resolveSoftLandingVariant,
} from './softLanding';

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
      // Kısa kavramlarda tam token; uzunlarda stem/includes. "bi"→"bir" engellenir.
      signals: words
        .filter((word) => includesNormalizedConcept(normalized, word))
        .map(normalizeText),
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

/**
 * Fiyat / plan daraltması mı? (hedef/konu değişmeden “bu kez ücretli” gibi)
 * Bunlar topic switch sayılmaz — geçmiş goal korunur.
 */
export function isPriceOnlyRefinement(question) {
  const normalized = normalizeText(question);
  if (!normalized) return false;
  const intent = understandQuestion(question);
  if (intent.goals.length > 0 || intent.concepts.length > 0) return false;
  if (!(intent.wantsFree || intent.wantsPaid)) return false;
  // Açık domain/pivot dili varsa fiyat-only değil
  if (
    /\b(konu|topic|gorsel|video|kod|sunum|muzik|ses|logo|seo|email|eposta|ceviri|hukuk|3d|image|code|music|legal)\b/.test(
      normalized
    )
  ) {
    return false;
  }
  return true;
}

/** Explicit topic reset / switch cues in the current utterance. */
export function isTopicSwitchUtterance(question) {
  const normalized = normalizeText(question);
  if (!normalized) return false;
  // "Bu kez ücretli göster" fiyat daraltmasıdır; konu değişimi değil.
  if (isPriceOnlyRefinement(question)) return false;
  return (
    /^(hayir|no|instead)\b/.test(normalized) ||
    /\b(bu kez|bu sefer|konu degis|baska bir sey|baska konu|degil .* istiyorum|not that|something else|different topic)\b/.test(
      normalized
    ) ||
    /\b(instead i want|switch to|degistir.*konu)\b/.test(normalized)
  );
}

/** Pure ranking / “which is best” follow-ups without a new domain. */
export function isRankingFollowUp(question) {
  const normalized = normalizeText(question);
  if (!normalized) return false;
  if (isTopicSwitchUtterance(question)) return false;
  if (isPriceOnlyRefinement(question)) {
    // Fiyat + hangisi: ranking değil, filter refinement (wantsComparison ayrı yönetilir)
    return false;
  }
  return (
    /\b(en iyi|hangisi|hangileri|karsilastir|compare|which (one|is)|best (one|option)|en guclu|one cikan)\b/.test(
      normalized
    ) && normalized.split(/\s+/).filter(Boolean).length <= 12
  );
}

export function understandConversation(question, history = []) {
  const currentIntent = understandQuestion(question);
  const contextualIntent = understandQuestion(buildRetrievalQuery(question, history));
  const currentHasPricePreference = currentIntent.wantsFree || currentIntent.wantsPaid;
  const currentHasTopic = currentIntent.concepts.length > 0;
  const currentHasGoal = currentIntent.goals.length > 0;
  const priceOnly = isPriceOnlyRefinement(question);
  const topicSwitch = isTopicSwitchUtterance(question);
  const rankingFollowUp = isRankingFollowUp(question);
  const hasUserHistory = (history || []).some((message) => message?.role === 'user');

  // Topic switch: never keep old goals/concepts when user clearly pivots.
  // Ranking / price-only follow-up without new topic: keep history goals.
  let goals;
  if (currentHasGoal) {
    goals = currentIntent.goals;
  } else if (topicSwitch) {
    goals = [];
  } else if (currentHasTopic && !priceOnly && !rankingFollowUp) {
    goals = [];
  } else if (rankingFollowUp || priceOnly || !currentHasTopic) {
    goals = contextualIntent.goals;
  } else {
    goals = [];
  }

  const carriedFromHistory =
    !currentHasGoal &&
    !topicSwitch &&
    (!currentHasTopic || priceOnly || rankingFollowUp) &&
    goals.length > 0 &&
    hasUserHistory;

  const concepts =
    topicSwitch || (currentHasTopic && !priceOnly && !rankingFollowUp)
      ? currentIntent.concepts
      : rankingFollowUp || priceOnly
        ? contextualIntent.concepts
        : currentHasTopic
          ? currentIntent.concepts
          : contextualIntent.concepts;

  const tokens =
    topicSwitch || (currentHasTopic && !priceOnly && !rankingFollowUp)
      ? currentIntent.tokens
      : rankingFollowUp || priceOnly
        ? contextualIntent.tokens
        : currentHasTopic
          ? currentIntent.tokens
          : contextualIntent.tokens;

  const signals =
    topicSwitch || (currentHasTopic && !priceOnly && !rankingFollowUp)
      ? currentIntent.signals
      : rankingFollowUp || priceOnly
        ? contextualIntent.signals
        : currentHasTopic
          ? currentIntent.signals
          : contextualIntent.signals;

  return {
    ...contextualIntent,
    tokens,
    concepts,
    signals,
    goals,
    wantsFree: currentHasPricePreference ? currentIntent.wantsFree : contextualIntent.wantsFree,
    wantsPaid: currentHasPricePreference ? currentIntent.wantsPaid : contextualIntent.wantsPaid,
    // Follow-up "hangileri" çoğu zaman fiyat daraltmasıdır; katı karşılaştırma formatına zorlama.
    // Ranking follow-ups ("en iyisi hangisi") with history keep comparison mode when requested.
    wantsComparison: carriedFromHistory
      ? (currentIntent.wantsComparison || rankingFollowUp) && !currentHasPricePreference
      : currentIntent.wantsComparison || (rankingFollowUp && hasUserHistory && goals.length > 0),
    carriedFromHistory,
    topicSwitch,
    rankingFollowUp,
    priceOnly,
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

  // Karşılaştırmada mümkünse hem free hem paid banttan en az bir örnek tut.
  if (
    intent.wantsComparison &&
    !intent.wantsFree &&
    !intent.wantsPaid &&
    diverse.length >= 2 &&
    diverse.length <= limit
  ) {
    const hasFree = diverse.some(({ record }) => isFreePricing(record));
    const hasPaid = diverse.some(({ record }) => isPaidPricing(record));
    if (!hasFree || !hasPaid) {
      const wantFree = !hasFree;
      const fill = sorted.find((item) => {
        if (diverse.some((picked) => picked.record.id === item.record.id)) return false;
        const family = toolFamily(item.record);
        if (family && families.has(family)) return false;
        return wantFree ? isFreePricing(item.record) : isPaidPricing(item.record);
      });
      if (fill) {
        if (diverse.length >= limit) diverse.pop();
        const family = toolFamily(fill.record);
        if (family) families.add(family);
        diverse.push(fill);
        diverse.sort(
          (a, b) =>
            b.score - a.score || String(a.record.name).localeCompare(String(b.record.name), 'tr')
        );
      }
    }
  }

  return diverse.slice(0, limit);
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
      'Ben Kâşif’im — AI Keşif Platformu’nun iş bitirme ve karar orkestratörüyüm. İhtiyacı anlar, onaylı katalogdan doğru araçları seçer, işi adımlara böler, uygulanabilir çıktılar üretir ve sonucu tamamlanana kadar takip ederim.',
    capabilities:
      'Bir sistem CEO’su gibi çalışabilirim: hedefi netleştirir, ücretsiz/ücretli araçları araştırıp karşılaştırır, çok adımlı çalışma planı kurar, hazır iş paketleri ve sihirbazlarla ilk çıktıyı üretir, otomasyon/partner bağlantılarına devreder, sonucu ve tamamlanma kanıtını izler, yeni katalog araçlarını keşif kuyruğuna alırım. Örnek: “SaaS lansmanımı planla”, “sunumumu üret”, “toplantıdan görev çıkar”, “bu aracı kataloğa ekle: URL”.',
    how: 'Soruyu Türkçe veya İngilizce anlar; hızlı yerel eşleşme, öğrenilmiş taksonomi ve gerektiğinde yapılandırılmış model zinciriyle niyeti çıkarırım. Önerileri yalnızca onaylı katalog verisiyle temellendiririm; Workmind planı, iş sihirbazı, çalıştırılabilir paket ve sonuç köprüsüyle öneriden tamamlanmış işe ilerlerim. Açık web keşfi güvenlik nedeniyle yalnız yönetici kontrollü onay kuyruğuna yazar; otomatik yayımlamaz.',
  };
  const en = {
    identity:
      'I am Kâşif — AI Keşif Platformu’s job-completion and decision orchestrator. I understand the goal, select grounded tools, build an execution plan, produce usable deliverables, and track the work through completion.',
    capabilities:
      'I can act like a system CEO: clarify a goal, research and compare free or paid tools, orchestrate multi-step workflows, generate first deliverables with job packs and wizards, hand work to automation or partner providers, track completion evidence, and place newly discovered tools into the catalog approval queue. Try: “plan my SaaS launch”, “produce a pitch deck”, “turn this meeting into tasks”, or “add this tool: URL”.',
    how: 'I understand Turkish and English through local matching, learned taxonomy, and a structured provider fallback when needed. Recommendations stay grounded in the approved catalog; Workmind plans, job wizards, runnable packs, and the result bridge move from recommendation to completed work. Open-web discovery is admin-controlled and writes only to an approval queue, never directly to production.',
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

export function answerContextlessFollowUp(question, locale = 'tr', history = [], options = {}) {
  if (!isContextlessFollowUp(question, history)) return null;

  const intent = understandQuestion(question);
  const variant = resolveSoftLandingVariant(
    options.variant || options.softLandingVariant,
    options.seed || question,
    {
      force: options.force,
      defaultVariant: options.defaultVariant,
      opsPin: options.opsPin,
    }
  );

  const answer = buildSoftLandingAnswer(intent, locale, variant);
  const starters = listSoftLandingStarters(locale, {
    limit: 6,
    preferIds: intent.wantsFree
      ? ['presentation', 'code', 'seo', 'image']
      : intent.wantsPaid
        ? ['seo', 'email', 'meeting', 'support']
        : ['presentation', 'seo', 'email', 'meeting'],
  });

  return {
    answer,
    sourceIds: [],
    insufficientContext: false,
    confidence: 0.92,
    meta: true,
    metaKind: 'soft-landing',
    softLanding: true,
    softLandingVariant: variant,
    starters,
    intent: {
      concepts: [],
      goals: [],
      pricePreference: intent.wantsFree ? 'free' : intent.wantsPaid ? 'paid' : 'any',
      comparison: intent.wantsComparison,
      meta: 'soft-landing',
      softLandingVariant: variant,
    },
  };
}

export function answerQuestion(
  question,
  records,
  history = [],
  locale = 'tr',
  intentOverride = null
) {
  const meta = answerMetaQuestion(question, locale);
  if (meta) return meta;

  if (isContextlessFollowUp(question, history)) {
    return answerContextlessFollowUp(question, locale, history);
  }

  const intent = intentOverride || understandConversation(question, history);
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
      const platforms = Array.isArray(record.platforms)
        ? record.platforms.filter(Boolean).slice(0, 3).join(', ')
        : '';
      const platformPart = platforms
        ? locale === 'en'
          ? ` · Platforms: ${platforms}`
          : ` · Platformlar: ${platforms}`
        : '';
      return `${index + 1}. ${record.name} — ${category} · ${pricing}${platformPart}${why}${detail ? `\n${detail}` : ''}`;
    }
    return `${index + 1}. ${record.name}${why}${detail ? `: ${detail}` : ''}`;
  });

  let verdict = '';
  if (intent.wantsComparison && ranked.length >= 2) {
    const freePick = ranked.find(({ record }) => isFreePricing(record));
    const paidPick = ranked.find(({ record }) => isPaidPricing(record));
    const top = ranked[0].record;
    if (locale === 'en') {
      verdict = `\nQuick take: ${top.name} ranks highest overall.`;
      if (freePick && freePick.record.id !== top.id) {
        verdict += ` Best free/freemium lean: ${freePick.record.name}.`;
      }
      if (paidPick && paidPick.record.id !== top.id && paidPick !== freePick) {
        verdict += ` Stronger paid lean: ${paidPick.record.name}.`;
      }
    } else {
      verdict = `\nKısa özet: Genel sıralamada ${top.name} öne çıkıyor.`;
      if (freePick && freePick.record.id !== top.id) {
        verdict += ` Ücretsiz/freemium tarafında ${freePick.record.name} güçlü.`;
      }
      if (paidPick && paidPick.record.id !== top.id && paidPick !== freePick) {
        verdict += ` Ücretli tarafta ${paidPick.record.name} öne çıkıyor.`;
      }
    }
  }

  const topScore = ranked[0].score;
  // Skor tabanlı güven + niyet netliği için taban (eski düşük güven gürültüsünü azaltır).
  let confidence = Math.min(0.98, Number((topScore / 30).toFixed(2)));
  if (intent.goals.length > 0) confidence = Math.max(confidence, 0.72);
  if (intent.goals.length > 0 && (intent.wantsFree || intent.wantsPaid)) {
    confidence = Math.max(confidence, 0.78);
  }
  if (intent.carriedFromHistory && intent.goals.length > 0) {
    confidence = Math.max(confidence, 0.8);
  }
  if (ranked[0].reasons?.includes('direct-match')) {
    confidence = Math.max(confidence, 0.8);
  }
  confidence = Math.min(0.98, Number(confidence.toFixed(2)));

  const sourceIds = ranked.map(({ record }) => `tool:${record.id}`);
  const sourceReasons = Object.fromEntries(
    ranked.map(({ record, reasons }) => [`tool:${record.id}`, reasons || []])
  );

  return {
    answer: `${intro}\n\n${lines.join('\n')}${verdict}\n\n${
      locale === 'en'
        ? 'Results were calculated exclusively from AI Keşif Platformu records.'
        : 'Sonuçlar yalnızca AI Keşif Platformu kayıtlarından hesaplandı.'
    }`,
    sourceIds,
    sourceReasons,
    insufficientContext: false,
    confidence,
    intent: {
      concepts: intent.concepts,
      goals: intent.goals,
      pricePreference: intent.wantsFree ? 'free' : intent.wantsPaid ? 'paid' : 'any',
      comparison: intent.wantsComparison,
      carriedFromHistory: Boolean(intent.carriedFromHistory),
    },
  };
}
