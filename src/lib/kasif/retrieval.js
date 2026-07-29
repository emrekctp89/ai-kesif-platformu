import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { embedGeminiText } from '@/utils/gemini';
import { KASIF_CONCEPTS, KASIF_GOALS } from './lexicon';

const DEFAULT_VECTOR_MATCH_THRESHOLD = 0.65;
const DEFAULT_VECTOR_MATCH_COUNT = 30;
const DEFAULT_FAST_PATH_CONFIDENT_MATCHES = 3;

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

/**
 * Tam token eşlemesi (veya çok kelimeli ifade).
 * "bi" ≠ "bir".
 */
export function includesNormalizedToken(haystack, needle) {
  const h = normalizeText(haystack);
  const n = normalizeText(needle);
  if (!h || !n) return false;
  if (n.includes(' ')) return h.includes(n);
  return new RegExp(`(?:^|\\s)${escapeRegExp(n)}(?:\\s|$)`).test(h);
}

/**
 * Kavram sinyali: kısa kelimelerde tam token, uzunlarda mevcut stem/includes.
 * Goal/evidence için includesNormalized kullanılmaya devam eder.
 */
export function includesNormalizedConcept(haystack, needle) {
  const n = normalizeText(needle);
  if (!n) return false;
  if (n.length <= 3 && !n.includes(' ')) {
    return includesNormalizedToken(haystack, needle);
  }
  return includesNormalized(haystack, needle);
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
    words.some((word) => includesNormalizedConcept(normalized, word))
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
    .filter((words) => words.some((word) => includesNormalizedConcept(normalized, word)))
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

/**
 * PostgREST `.or()` için güvenli tek-token filtreleri üretir.
 * Çok kelimeli evidence ifadeleri parçalanır; boşluk/`,` filtreyi bozmaz.
 */
export function buildSearchFilter(terms) {
  const tokens = [];
  const seen = new Set();
  for (const raw of terms || []) {
    for (const part of String(raw || '').split(/\s+/)) {
      const cleaned = part.replace(/[%*,()]/g, '').trim();
      if (cleaned.length < 3) continue;
      const key = normalizeText(cleaned);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      tokens.push(cleaned);
      if (tokens.length >= 14) break;
    }
    if (tokens.length >= 14) break;
  }
  return tokens
    .flatMap((term) => [`name.ilike.%${term}%`, `description.ilike.%${term}%`])
    .join(',');
}

export function scoreLexicalMatch(record, terms) {
  const name = normalizeText(record?.name);
  const description = normalizeText(record?.description);
  return (terms || []).reduce((score, term) => {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) return score;
    if (name.includes(normalizedTerm)) return score + 3;
    if (description.includes(normalizedTerm)) return score + 1;
    return score;
  }, 0);
}

export function shouldUseVectorFallback(records, directTerms, minimumConfidentMatches = 3) {
  if (!Array.isArray(records) || records.length === 0) return true;
  return (
    records.filter((record) => scoreLexicalMatch(record, directTerms) >= 2).length <
    minimumConfidentMatches
  );
}

function numberFromEnv(name, fallback, { min, max }) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function normalizeToolRecord(row) {
  return {
    ...row,
    category: row.category || (row.category_name ? { name: row.category_name } : null),
    is_verified: Boolean(row.is_verified),
  };
}

async function retrieveVectorMatches(supabase, query, signal) {
  if (!process.env.GEMINI_API_KEY) return [];
  const queryEmbedding = await embedGeminiText(query);
  const { data: matches, error: matchError } = await supabase.rpc('match_tools', {
    query_embedding: queryEmbedding,
    match_threshold: numberFromEnv('KASIF_VECTOR_MATCH_THRESHOLD', DEFAULT_VECTOR_MATCH_THRESHOLD, {
      min: 0,
      max: 1,
    }),
    match_count: numberFromEnv('KASIF_VECTOR_MATCH_COUNT', DEFAULT_VECTOR_MATCH_COUNT, {
      min: 1,
      max: 100,
    }),
  });
  if (matchError) {
    throw new Error(
      `KASIF_VECTOR_RETRIEVAL_FAILED: ${matchError.message || matchError.code || 'unknown'}`
    );
  }
  const ids = (matches || []).map((match) => match.id).filter(Boolean);
  if (!ids.length) return [];

  let builder = supabase
    .from('tools_with_ratings')
    .select(
      'id, name, slug, link, description, pricing_model, platforms, is_featured, tier, average_rating, total_ratings, category_name'
    )
    .in('id', ids)
    .eq('is_approved', true);
  if (signal && typeof builder.abortSignal === 'function') builder = builder.abortSignal(signal);
  const { data, error } = await builder;
  if (error) {
    throw new Error(`KASIF_VECTOR_HYDRATION_FAILED: ${error.message || error.code || 'unknown'}`);
  }
  const byId = new Map((data || []).map((record) => [String(record.id), record]));
  return ids
    .map((id) => {
      const record = byId.get(String(id));
      const match = matches.find((candidate) => String(candidate.id) === String(id));
      return record ? { ...record, vector_similarity: Number(match?.similarity) || 0 } : null;
    })
    .filter(Boolean);
}

export function mergeHybridResults(lexicalRecords, vectorRecords) {
  const merged = [];
  const seen = new Set();
  for (const record of [...(vectorRecords || []), ...(lexicalRecords || [])]) {
    const key = record?.id ? `id:${record.id}` : `slug:${record?.slug}`;
    if (!record || seen.has(key)) continue;
    seen.add(key);
    merged.push(normalizeToolRecord(record));
  }
  return merged;
}

export async function retrievePlatformContext(question, history = []) {
  const retrievalQuery = buildRetrievalQuery(question, history, { isolateCurrentTopic: true });
  const terms = expandSearchTerms(retrievalQuery);
  if (!terms.length) return [];
  const filter = buildSearchFilter(terms);
  if (!filter) return [];

  const supabase = await createClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    // tools_with_ratings: average_rating/total_ratings; is_verified tools tablosunda yok.
    const { data, error } = await supabase
      .from('tools_with_ratings')
      .select(
        'id, name, slug, link, description, pricing_model, platforms, is_featured, tier, average_rating, total_ratings, category_name'
      )
      .eq('is_approved', true)
      .or(filter)
      .order('is_featured', { ascending: false })
      .order('id', { ascending: true })
      .limit(250)
      .abortSignal(controller.signal);
    if (error) {
      const detail = error.message || error.code || 'unknown';
      throw new Error(`KASIF_RETRIEVAL_FAILED: ${detail}`);
    }

    const lexicalRecords = (data || []).map(normalizeToolRecord);
    const directTerms = extractSearchTerms(retrievalQuery);
    const minimumConfidentMatches = numberFromEnv(
      'KASIF_FAST_PATH_CONFIDENT_MATCHES',
      DEFAULT_FAST_PATH_CONFIDENT_MATCHES,
      { min: 1, max: 20 }
    );
    if (!shouldUseVectorFallback(lexicalRecords, directTerms, minimumConfidentMatches)) {
      return lexicalRecords;
    }
    try {
      return mergeHybridResults(
        lexicalRecords,
        await retrieveVectorMatches(supabase, retrievalQuery, controller.signal)
      );
    } catch {
      return lexicalRecords;
    }
  } finally {
    clearTimeout(timeout);
  }
}
