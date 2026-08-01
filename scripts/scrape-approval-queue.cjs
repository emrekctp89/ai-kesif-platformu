#!/usr/bin/env node

const path = require('node:path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { createJiti } = require('jiti');

const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env.local'), quiet: true });
dotenv.config({ path: path.join(root, '.env'), quiet: true });

const jiti = createJiti(__filename, { alias: { '@': path.join(root, 'src') } });
const { buildScrapeQueue, scrapeToolPage } = jiti('../src/lib/toolScrape/index.js');
const { slugify } = jiti('../src/utils/slugify.js');

function parseArgs(argv) {
  const options = { apply: false, confirm: '', limit: 3, category: 'all', provider: 'auto' };
  for (const arg of argv) {
    if (arg === '--apply') options.apply = true;
    else if (arg.startsWith('--confirm=')) options.confirm = arg.slice(10);
    else if (arg.startsWith('--limit=')) options.limit = Number.parseInt(arg.slice(8), 10);
    else if (arg.startsWith('--category=')) options.category = arg.slice(11);
    else if (arg.startsWith('--provider=')) options.provider = arg.slice(11);
  }
  options.limit = Number.isFinite(options.limit) ? Math.min(10, Math.max(1, options.limit)) : 3;
  if (!['auto', 'native', 'jina'].includes(options.provider)) options.provider = 'auto';
  return options;
}

function technicalDetails(candidate) {
  return [
    '## Özellikler',
    ...(candidate.features || []).map((item) => `- ${item}`),
    '',
    '## Kullanım alanları',
    ...(candidate.use_cases || []).map((item) => `- ${item}`),
    '',
    candidate.target_users?.length
      ? `## Kimler için\n${candidate.target_users.map((item) => `- ${item}`).join('\n')}`
      : '',
    candidate.limitations?.length
      ? `## Dikkat\n${candidate.limitations.map((item) => `- ${item}`).join('\n')}`
      : '',
    `> Kaynak: ${candidate.source_reason || 'Kâşif scrape CLI'}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function uniqueSlug(admin, name) {
  const base = slugify(name).slice(0, 80) || `scraped-tool-${Date.now()}`;
  for (let index = 1; index <= 20; index += 1) {
    const slug = index === 1 ? base : `${base}-${index}`;
    const { data, error } = await admin.from('tools').select('id').eq('slug', slug).maybeSingle();
    if (error) throw error;
    if (!data) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.apply && options.confirm !== 'QUEUE_SCRAPED_TOOLS') {
    throw new Error('--apply için --confirm=QUEUE_SCRAPED_TOOLS gerekli.');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase production environment eksik.');
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: tools, error: toolsError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      admin.from('tools').select('id, name, slug, link, is_approved').limit(5000),
      admin.from('categories').select('id, name, slug').limit(100),
    ]);
  if (toolsError) throw toolsError;
  if (categoriesError) throw categoriesError;

  const categoryBySlug = new Map((categories || []).map((item) => [item.slug, item]));
  const built = buildScrapeQueue({
    categorySlug: options.category,
    catalogTools: tools || [],
    limit: options.limit,
    includeGeneral: true,
  });
  const results = [];

  for (const job of built.queue.slice(0, options.limit)) {
    const category = categoryBySlug.get(job.categorySlug);
    if (!category) {
      results.push({ seed: job.name, ok: false, error: `Kategori yok: ${job.categorySlug}` });
      continue;
    }
    const scrape = await scrapeToolPage(job.url, { provider: options.provider });
    if (!scrape.ok) {
      results.push({ seed: job.name, url: job.url, ok: false, error: scrape.error });
      continue;
    }

    const candidate = { ...scrape.candidate };
    if (/^title\s*:/i.test(candidate.name) || /^[\w-]+\.(?:ai|io|com|app)$/i.test(candidate.name)) {
      candidate.name = job.name;
    }
    const summary = {
      seed: job.name,
      name: candidate.name,
      link: candidate.link,
      category: category.slug,
      provider: scrape.provider,
      evidenceScore: scrape.quality?.evidenceScore || 0,
      inferredFields: scrape.quality?.inferredFields || [],
      queued: false,
    };

    if (options.apply) {
      const slug = await uniqueSlug(admin, candidate.name);
      const { data, error } = await admin
        .from('tools')
        .insert({
          name: candidate.name,
          slug,
          description: candidate.description,
          link: candidate.link,
          category_id: category.id,
          pricing_model: candidate.pricing_model || 'Freemium',
          platforms: candidate.platforms || ['Web'],
          tier: 'Normal',
          is_approved: false,
          suggester_email: 'tool-scrape-cli@aikesif.com',
          technical_details: technicalDetails(candidate),
          link_check_status: 'review',
          link_check_error: 'Kâşif scrape CLI: admin approval required.',
          link_checked_at: new Date().toISOString(),
        })
        .select('id, name, slug, link, is_approved')
        .single();
      if (error) throw error;
      summary.queued = true;
      summary.inserted = data;
    }
    results.push(summary);
  }

  console.log(
    JSON.stringify(
      {
        mode: options.apply ? 'approval_queue' : 'dry_run',
        requested: options.limit,
        processed: results.length,
        succeeded: results.filter((item) => item.ok !== false).length,
        queued: results.filter((item) => item.queued).length,
        skippedPrefilter: built.skipped.length,
        results,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('Scrape approval queue failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
