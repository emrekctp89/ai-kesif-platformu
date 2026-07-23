/**
 * Kâşif geri bildirim özeti.
 * Negatif feedback alan soruları gruplar; lexicon kural adayları önerir.
 *
 * Kullanım:
 *   node ./scripts/kasif-feedback-report.mjs
 *   node ./scripts/kasif-feedback-report.mjs --days=30 --limit=50
 *
 * Gerekli env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const days = Number(process.argv.find((arg) => arg.startsWith('--days='))?.split('=')[1] || 30);
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 40);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const { data, error } = await supabase
  .from('kasif_interactions')
  .select('id, question, answer, intent, confidence, feedback, created_at, source_ids')
  .not('feedback', 'is', null)
  .gte('created_at', since)
  .order('created_at', { ascending: false })
  .limit(500);

if (error) {
  console.error('Failed to load kasif_interactions:', error.message);
  process.exit(1);
}

const rows = data || [];
const positive = rows.filter((row) => Number(row.feedback) > 0);
const negative = rows.filter((row) => Number(row.feedback) < 0);

function tokenize(question) {
  return String(question || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 4);
}

const negativeTokenCounts = new Map();
for (const row of negative) {
  for (const token of tokenize(row.question)) {
    negativeTokenCounts.set(token, (negativeTokenCounts.get(token) || 0) + 1);
  }
}

const topNegativeTokens = [...negativeTokenCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);

const goalMisses = new Map();
for (const row of negative) {
  const goals = row.intent?.goals || [];
  const key = goals.length ? goals.join(',') : '(goal-yok)';
  goalMisses.set(key, (goalMisses.get(key) || 0) + 1);
}

const report = {
  windowDays: days,
  totalWithFeedback: rows.length,
  positive: positive.length,
  negative: negative.length,
  helpfulRate: rows.length > 0 ? Number(((positive.length / rows.length) * 100).toFixed(1)) : null,
  topNegativeTokens: topNegativeTokens.map(([token, count]) => ({ token, count })),
  negativeGoalBuckets: [...goalMisses.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([goals, count]) => ({ goals, count })),
  recentNegativeSamples: negative.slice(0, limit).map((row) => ({
    id: row.id,
    question: row.question,
    goals: row.intent?.goals || [],
    confidence: row.confidence,
    created_at: row.created_at,
  })),
  ruleCandidates: topNegativeTokens.slice(0, 8).map(([token, count]) => ({
    token,
    count,
    suggestion: `Lexicon'a "${token}" için concept/goal evidence eklemeyi veya negativeEvidence ayırmayı değerlendir.`,
  })),
};

console.log(JSON.stringify(report, null, 2));
