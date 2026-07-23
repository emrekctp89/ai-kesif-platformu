/**
 * Eski kasif_interactions kayıtlarını dry-run yeniden yorumlar (DB yazmaz).
 *
 *   npm run kasif:reprocess-intents
 *   npm run kasif:reprocess-intents -- --days=30 --limit=50
 *
 * Motor Jest üzerinden yüklenir (server-only / path alias uyumu).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

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

const payloadPath = path.resolve(`.kasif-reprocess-input.json`);
fs.writeFileSync(payloadPath, JSON.stringify(data || []));

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'jest',
    '--runInBand',
    '--testPathPatterns=kasif-reprocess-worker',
    '--coverage=false',
  ],
  {
    env: {
      ...process.env,
      KASIF_REPROCESS_INPUT: payloadPath,
    },
    encoding: 'utf8',
    shell: true,
  }
);

process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');

try {
  fs.unlinkSync(payloadPath);
} catch {}

process.exit(result.status ?? 1);
