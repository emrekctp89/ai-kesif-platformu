/**
 * Kâşif geri bildirim özeti.
 * Negatif feedback alan soruları gruplar; lexicon kural adayları önerir.
 *
 * Kullanım:
 *   node ./scripts/kasif-feedback-report.mjs
 *   node ./scripts/kasif-feedback-report.mjs --days=30 --limit=50
 *
 * Gerekli env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (veya SUPABASE_SERVICE_KEY)
 */

import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildKasifQualityStats } = require('../src/lib/kasif/qualityStats.js');

const days = Number(process.argv.find((arg) => arg.startsWith('--days='))?.split('=')[1] || 30);
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 40);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY.'
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const { data, error } = await supabase
  .from('kasif_interactions')
  .select('id, question, answer, intent, confidence, feedback, created_at, source_ids')
  .gte('created_at', since)
  .order('created_at', { ascending: false })
  .limit(500);

if (error) {
  console.error('Failed to load kasif_interactions:', error.message);
  process.exit(1);
}

const report = buildKasifQualityStats(data || [], {
  windowDays: days,
  sampleLimit: limit,
});

console.log(JSON.stringify(report, null, 2));
