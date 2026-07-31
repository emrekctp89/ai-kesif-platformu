#!/usr/bin/env node
/**
 * Offline / ops embedding backfill for approved catalog tools.
 *
 * Usage:
 *   node scripts/generate_embeddings.mjs --status
 *   node scripts/generate_embeddings.mjs --probe
 *   node scripts/generate_embeddings.mjs --dry-run --limit=20
 *   node scripts/generate_embeddings.mjs --limit=50 --delay-ms=400
 *   node scripts/generate_embeddings.mjs --loop --limit=100 --max-batches=10
 *   node scripts/generate_embeddings.mjs --all --limit=25
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   GEMINI_API_KEY
 *   GEMINI_EMBED_MODEL (default gemini-embedding-2)
 *
 * See docs/EMBEDDING_BACKFILL.md for the production runbook.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const embeddingModel = (process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-2').replace(
  /^models\//,
  ''
);
const EMBEDDING_DIMENSIONS = 768;

function parseArgs(argv) {
  const options = {
    status: false,
    probe: false,
    dryRun: false,
    onlyMissing: true,
    loop: false,
    limit: 50,
    delayMs: 400,
    maxBatches: 20,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--status') options.status = true;
    else if (arg === '--probe') options.probe = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--all') options.onlyMissing = false;
    else if (arg === '--only-missing') options.onlyMissing = true;
    else if (arg === '--loop') options.loop = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--limit=')) {
      options.limit = Math.min(Math.max(Number(arg.slice('--limit='.length)) || 50, 1), 200);
    } else if (arg.startsWith('--delay-ms=')) {
      options.delayMs = Math.min(Math.max(Number(arg.slice('--delay-ms='.length)) || 0, 0), 5000);
    } else if (arg.startsWith('--max-batches=')) {
      options.maxBatches = Math.min(
        Math.max(Number(arg.slice('--max-batches='.length)) || 1, 1),
        100
      );
    } else {
      console.warn(`Unknown argument ignored: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Tool embedding backfill

  --status              Print coverage only (no API writes)
  --probe               Call Gemini once and validate a 768-d vector (no DB write)
  --dry-run             List tools that would be embedded
  --only-missing        Skip tools that already have embeddings (default)
  --all                 Re-embed approved tools even if embedding exists
  --limit=N             Batch size (1–200, default 50)
  --delay-ms=N          Pause between Gemini calls (default 400)
  --loop                Keep running batches until no missing tools (or max-batches)
  --max-batches=N       Safety cap when --loop is set (default 20)
  --help                Show this message
`);
}

function createSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key).');
    process.exit(1);
  }
  return createClient(supabaseUrl, supabaseKey);
}

async function getCoverage(supabase) {
  const approved = await supabase
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('is_approved', true);
  if (approved.error) throw new Error(approved.error.message);

  const missing = await supabase
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('is_approved', true)
    .is('embedding', null);
  if (missing.error) throw new Error(missing.error.message);

  const approvedCount = approved.count || 0;
  const missingCount = missing.count || 0;
  const withEmbedding = Math.max(approvedCount - missingCount, 0);
  const coveragePct =
    approvedCount === 0 ? 100 : Math.round((withEmbedding / approvedCount) * 1000) / 10;

  return {
    approved: approvedCount,
    withEmbedding,
    missing: missingCount,
    coveragePct,
    readyForVectorFallback: approvedCount > 0 && coveragePct >= 95,
  };
}

function printCoverage(label, coverage) {
  console.log(
    `${label}: approved=${coverage.approved} withEmbedding=${coverage.withEmbedding} missing=${coverage.missing} coverage=${coverage.coveragePct}% ready=${coverage.readyForVectorFallback}`
  );
}

async function fetchBatch(supabase, { onlyMissing, limit }) {
  let query = supabase
    .from('tools')
    .select('id, name, description')
    .eq('is_approved', true)
    .order('id', { ascending: true })
    .limit(limit);

  if (onlyMissing) {
    query = query.is('embedding', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function getEmbedding(text) {
  const payload = {
    model: `models/${embeddingModel}`,
    content: { parts: [{ text: String(text || '').slice(0, 12000) }] },
    outputDimensionality: EMBEDDING_DIMENSIONS,
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || 'Embedding API error');
  }
  const values = result.embedding?.values;
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Unexpected embedding length: ${values?.length || 0}`);
  }
  return values;
}

function sleep(ms) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processBatch(supabase, tools, { dryRun, delayMs }) {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const label = `[${i + 1}/${tools.length}] ${tool.name} (#${tool.id})`;

    if (dryRun) {
      console.log(`${label} — would embed`);
      successCount++;
      continue;
    }

    process.stdout.write(`${label}... `);
    try {
      const embedding = await getEmbedding(`${tool.name}. ${tool.description || ''}`);
      const { error: updateError } = await supabase
        .from('tools')
        .update({ embedding: `[${embedding.join(',')}]` })
        .eq('id', tool.id);

      if (updateError) {
        console.log(`DB fail: ${updateError.message}`);
        failCount++;
      } else {
        console.log('ok');
        successCount++;
      }
    } catch (err) {
      console.log(`fail: ${err.message}`);
      failCount++;
    }

    await sleep(delayMs);
  }

  return { successCount, failCount };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.probe) {
    if (!geminiApiKey) {
      console.error('Missing GEMINI_API_KEY.');
      process.exit(1);
    }
    const startedAt = Date.now();
    const embedding = await getEmbedding('AI Kesif embedding provider health check');
    console.log(
      `Gemini embedding probe OK: model=${embeddingModel} dimensions=${embedding.length} latencyMs=${Date.now() - startedAt}`
    );
    return;
  }

  const supabase = createSupabase();
  const coverageBefore = await getCoverage(supabase);
  printCoverage('Coverage before', coverageBefore);

  if (options.status) {
    process.exit(coverageBefore.readyForVectorFallback ? 0 : 2);
  }

  if (!options.dryRun && !geminiApiKey) {
    console.error('Missing GEMINI_API_KEY (required unless --status or --dry-run).');
    process.exit(1);
  }

  let batches = 0;
  let totalSuccess = 0;
  let totalFail = 0;
  let totalScanned = 0;

  do {
    batches += 1;
    const tools = await fetchBatch(supabase, {
      onlyMissing: options.onlyMissing,
      limit: options.limit,
    });

    if (!tools.length) {
      console.log('No tools to process in this batch.');
      break;
    }

    console.log(
      `\nBatch ${batches}: ${tools.length} tool(s) (onlyMissing=${options.onlyMissing}, dryRun=${options.dryRun})`
    );
    const { successCount, failCount } = await processBatch(supabase, tools, options);
    totalSuccess += successCount;
    totalFail += failCount;
    totalScanned += tools.length;

    const hasMore = tools.length === options.limit && options.onlyMissing;
    if (!options.loop || !hasMore || batches >= options.maxBatches) {
      if (options.loop && hasMore && batches >= options.maxBatches) {
        console.log(`Stopped at max-batches=${options.maxBatches}; re-run to continue.`);
      }
      break;
    }
  } while (true);

  console.log(
    `\nDone. batches=${batches} scanned=${totalScanned} success=${totalSuccess} failed=${totalFail}`
  );

  if (!options.dryRun) {
    const coverageAfter = await getCoverage(supabase);
    printCoverage('Coverage after', coverageAfter);
    if (!coverageAfter.readyForVectorFallback) {
      console.log(
        `Still below 95% coverage (${coverageAfter.coveragePct}%). Re-run with --loop or daily cron.`
      );
      process.exitCode = 2;
    }
  }
}

run().catch((error) => {
  console.error('Embedding backfill failed:', error?.message || error);
  process.exit(1);
});
