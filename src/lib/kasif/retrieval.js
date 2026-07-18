import 'server-only';
import { createClient } from '@/utils/supabase/server';

const STOP_WORDS = new Set([
  'acaba',
  'bana',
  'bir',
  'icin',
  'için',
  'ile',
  'olan',
  'olarak',
  'var',
  've',
]);

export function extractSearchTerms(question) {
  return String(question || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9çğıöşü\s-]/gi, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term))
    .slice(0, 6);
}

export async function retrievePlatformContext(question) {
  const terms = extractSearchTerms(question);
  if (!terms.length) return [];

  const supabase = await createClient();
  const filters = terms.flatMap((term) => [`name.ilike.%${term}%`, `description.ilike.%${term}%`]);

  const { data, error } = await supabase
    .from('tools')
    .select('id, name, slug, description, pricing_type, is_verified, category:categories(name)')
    .eq('is_approved', true)
    .or(filters.join(','))
    .limit(12);

  if (error) throw new Error('KASIF_RETRIEVAL_FAILED');
  return data || [];
}

export function serializeContext(records) {
  return records
    .map((item) =>
      [
        `SOURCE_ID: tool:${item.id}`,
        `Ad: ${item.name}`,
        `Açıklama: ${item.description || 'Belirtilmemiş'}`,
        `Kategori: ${item.category?.name || 'Belirtilmemiş'}`,
        `Fiyatlandırma: ${item.pricing_type || 'Belirtilmemiş'}`,
        `Doğrulanmış: ${item.is_verified ? 'Evet' : 'Hayır'}`,
      ].join('\n')
    )
    .join('\n\n---\n\n');
}
