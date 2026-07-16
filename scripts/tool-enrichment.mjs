#!/usr/bin/env node

const DEFAULT_URL = 'http://localhost:3005/api/cron/tool-enrichment';

function parseArgs(argv) {
  const options = {
    dryRun: true,
    includeGoodQuality: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--apply') {
      options.dryRun = false;
      continue;
    }
    if (arg === '--include-good-quality') {
      options.includeGoodQuality = true;
      continue;
    }
    if (arg.startsWith('--url=')) {
      options.url = arg.slice('--url='.length);
      continue;
    }
    if (arg.startsWith('--limit=')) {
      options.limit = arg.slice('--limit='.length);
      continue;
    }
  }

  return options;
}

function appendParam(searchParams, key, value) {
  if (value === undefined || value === null || value === '') return;
  searchParams.set(key, String(value));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const endpoint = new URL(options.url || process.env.TOOL_ENRICHMENT_URL || DEFAULT_URL);

  appendParam(endpoint.searchParams, 'limit', options.limit);
  appendParam(endpoint.searchParams, 'dryRun', options.dryRun ? 'true' : 'false');
  appendParam(
    endpoint.searchParams,
    'includeGoodQuality',
    options.includeGoodQuality ? 'true' : undefined
  );

  const cronSecret = process.env.CRON_SECRET;
  const headers = cronSecret ? { authorization: `Bearer ${cronSecret}` } : {};

  const response = await fetch(endpoint, { headers });
  const text = await response.text();

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) {
    console.error('Tool enrichment tetikleme başarısız:', response.status, payload);
    process.exit(1);
  }

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error('Tool enrichment script hatası:', error);
  process.exit(1);
});
