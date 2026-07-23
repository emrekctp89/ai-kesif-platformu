/**
 * Eski kasif_interactions kayıtlarını mevcut motorla dry-run yeniden yorumlar.
 * DB yazmaz; goal/güven farklarını raporlar.
 *
 *   node ./scripts/kasif-reprocess-intents.mjs --days=30 --limit=50
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY (veya SERVICE_ROLE_KEY)
 */

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// .env.local yükle (opsiyonel)
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (
      [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_SERVICE_KEY',
        'SUPABASE_SECRET_KEY',
      ].includes(key)
    ) {
      process.env[key] = value;
    }
  }
}

// server-only'yu jest'siz ortamda no-op yap
require.cache[require.resolve('server-only')] = {
  id: require.resolve('server-only'),
  filename: require.resolve('server-only'),
  loaded: true,
  exports: {},
};

const {
  answerMetaQuestion,
  answerQuestion,
  understandConversation,
} = require('../src/lib/kasif/engine.js');

const days = Number(process.argv.find((arg) => arg.startsWith('--days='))?.split('=')[1] || 30);
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 40);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error('Missing Supabase URL or service key.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const { data, error } = await supabase
  .from('kasif_interactions')
  .select('id, question, intent, confidence, created_at')
  .gte('created_at', since)
  .order('created_at', { ascending: false })
  .limit(limit);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const rows = data || [];
const changed = [];
let metaCount = 0;
let goalGained = 0;

for (const row of rows) {
  const question = String(row.question || '').trim();
  if (!question) continue;

  const meta = answerMetaQuestion(question, 'tr');
  if (meta) {
    metaCount += 1;
    const oldGoals = Array.isArray(row.intent?.goals) ? row.intent.goals : [];
    changed.push({
      id: row.id,
      question,
      kind: 'meta',
      oldGoals,
      newGoals: [],
      oldConfidence: row.confidence,
      newConfidence: meta.confidence,
      metaKind: meta.metaKind,
    });
    continue;
  }

  const intent = understandConversation(question, []);
  const oldGoals = Array.isArray(row.intent?.goals) ? row.intent.goals.join(',') : '';
  const newGoals = (intent.goals || []).join(',');
  const synthetic = answerQuestion(
    question,
    [
      {
        id: 1,
        name: 'Probe',
        description: `${question} sunum slayt görsel kod veri`,
        pricing_model: 'freemium',
      },
    ],
    [],
    'tr'
  );

  if (oldGoals !== newGoals || Number(row.confidence || 0) < 0.55) {
    if (!oldGoals && newGoals) goalGained += 1;
    changed.push({
      id: row.id,
      question,
      kind: 'intent',
      oldGoals: oldGoals ? oldGoals.split(',') : [],
      newGoals: intent.goals || [],
      oldConfidence: row.confidence,
      newConfidence: synthetic.confidence,
      pricePreference: intent.wantsFree ? 'free' : intent.wantsPaid ? 'paid' : 'any',
    });
  }
}

console.log(
  JSON.stringify(
    {
      scanned: rows.length,
      changed: changed.length,
      metaCount,
      goalGained,
      samples: changed.slice(0, 25),
    },
    null,
    2
  )
);
