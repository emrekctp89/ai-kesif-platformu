import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { KASIF_CONCEPTS, KASIF_GOALS } from './lexicon';

const STOP_WORDS = new Set([
  'acaba',
  'ai',
  'bana',
  'bir',
  'icin',
  'ile',
  'olan',
  'olarak',
  'var',
  've',
  'yapay',
  'zeka',
  'hangi',
  'nedir',
  'nasil',
  'lutfen',
  'istiyorum',
  'peki',
  'daha',
  'olanlar',
  'ucretsiz',
  'ucretli',
  'arac',
  'araci',
  'araclar',
  'araclari',
  'hazirlamak',
  'kullanmak',
  'kullanabilirim',
  'ariyorum',
  'oner',
  'oneri',
  'gerekli',
  'hangileri',
  'about',
  'any',
  'are',
  'can',
  'could',
  'for',
  'from',
  'help',
  'how',
  'looking',
  'need',
  'please',
  'recommend',
  'show',
  'some',
  'that',
  'the',
  'these',
  'this',
  'tool',
  'tools',
  'want',
  'what',
  'which',
  'with',
  'would',
]);

export function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize edilmiş metinde kelime/ifade arar.
 * 1–3 harflik kısa sinyaller (ik, ui, hr, seo) rastgele alt string false-positive
 * üretmesin diye token başında aranır: "ik" ≠ "müzik", ama "yaz" = "yazısı".
 */
export function includesNormalized(haystack, needle) {
  const h = normalizeText(haystack);
  const n = normalizeText(needle);
  if (!h || !n) return false;
  if (n.length <= 3) {
    return new RegExp(`(?:^|\\s)${escapeRegExp(n)}(?:[a-z0-9-]|\\s|$)`).test(h);
  }
  return h.includes(n);
}

export function extractSearchTerms(question) {
  return normalizeText(question)
    .split(/\s+/)
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term))
    .slice(0, 10);
}

function matchesGoal(goal, normalizedQuery) {
  return goal.queryGroups.every((group) =>
    group.some((word) => includesNormalized(normalizedQuery, word))
  );
}

function hasRecognizedTopic(question) {
  const normalized = normalizeText(question);
  const hasConcept = Object.values(KASIF_CONCEPTS).some((words) =>
    words.some((word) => includesNormalized(normalized, word))
  );
  if (hasConcept) return true;
  return Object.values(KASIF_GOALS).some((goal) => matchesGoal(goal, normalized));
}

export function buildRetrievalQuery(question, history = [], { isolateCurrentTopic = false } = {}) {
  const currentQuestion = String(question || '').trim();
  if (isolateCurrentTopic && hasRecognizedTopic(currentQuestion)) {
    return currentQuestion.slice(0, 1600);
  }

  const previousUserTurns = history
    .filter((message) => message?.role === 'user')
    .slice(-2)
    .map((message) => String(message.content || '').trim())
    .filter(Boolean);
  return [...previousUserTurns, currentQuestion].join(' ').slice(0, 1600);
}

function uniqueSearchTerms(terms) {
  const seen = new Set();
  const result = [];
  for (const raw of terms) {
    const term = String(raw || '').trim();
    if (!term) continue;
    const key = normalizeText(term);
    if (!key || key.length < 3 || STOP_WORDS.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(term);
  }
  return result;
}

export function expandSearchTerms(query) {
  const normalized = normalizeText(query);
  const baseTerms = extractSearchTerms(query);
  const conceptTerms = Object.values(KASIF_CONCEPTS)
    .filter((words) => words.some((word) => includesNormalized(normalized, word)))
    .flat();
  // Eşleşen hedeflerin evidence/query kelimeleri retrieval hatırlamasını güçlendirir.
  // Goal terimleri concept'ten önce gelir; slice diliminde kaybolmasınlar.
  const goalTerms = Object.values(KASIF_GOALS)
    .filter((goal) => matchesGoal(goal, normalized))
    .flatMap((goal) => {
      const evidence = Array.isArray(goal.evidence) ? goal.evidence : [];
      const groupWords = goal.queryGroups.flat();
      return [...evidence, ...groupWords].slice(0, 10);
    });

  return uniqueSearchTerms([...baseTerms, ...goalTerms, ...conceptTerms]).slice(0, 18);
}

export function buildSearchFilter(terms) {
  return terms.flatMap((term) => [`name.ilike.%${term}%`, `description.ilike.%${term}%`]).join(',');
}

export async function retrievePlatformContext(question, history = []) {
  const terms = expandSearchTerms(
    buildRetrievalQuery(question, history, { isolateCurrentTopic: true })
  );
  if (!terms.length) return [];
  const supabase = await createClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const { data, error } = await supabase
      .from('tools')
      .select(
        'id, name, slug, link, description, pricing_model, platforms, is_featured, is_verified, tier, average_rating, total_ratings, category:categories(name)'
      )
      .eq('is_approved', true)
      .or(buildSearchFilter(terms))
      .order('is_featured', { ascending: false })
      .order('id', { ascending: true })
      .limit(250)
      .abortSignal(controller.signal);
    if (error) throw new Error('KASIF_RETRIEVAL_FAILED');

    return data || [];
  } finally {
    clearTimeout(timeout);
  }
}
