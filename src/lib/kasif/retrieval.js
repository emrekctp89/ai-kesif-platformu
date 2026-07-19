import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { KASIF_CONCEPTS } from './lexicon';

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

export function extractSearchTerms(question) {
  return normalizeText(question)
    .split(/\s+/)
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term))
    .slice(0, 10);
}

function hasRecognizedTopic(question) {
  const normalized = normalizeText(question);
  return Object.values(KASIF_CONCEPTS).some((words) =>
    words.some((word) => normalized.includes(normalizeText(word)))
  );
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

export function expandSearchTerms(query) {
  const normalized = normalizeText(query);
  const baseTerms = extractSearchTerms(query);
  const conceptTerms = Object.values(KASIF_CONCEPTS)
    .filter((words) => words.some((word) => normalized.includes(normalizeText(word))))
    .flat();
  return [...new Set([...baseTerms, ...conceptTerms])].slice(0, 12);
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
        'id, name, slug, link, description, pricing_model, is_featured, tier, category:categories(name)'
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
