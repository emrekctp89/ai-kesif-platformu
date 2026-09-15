#!/usr/bin/env node
// Read-only R08 catalog baseline. Usage: npm run catalog:quality-report
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

loadEnv({ path: '.env.local', quiet: true });

export function analyzeCatalog(tools) {
  const approved = tools.filter((tool) => tool.is_approved === true);
  const issues = [];
  const names = new Map();
  const domains = new Map();
  const flag = (tool, type, detail = '') =>
    issues.push({ id: tool.id, slug: tool.slug, type, detail });

  for (const tool of approved) {
    const name = String(tool.name || '').trim();
    const nameKey = name.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
    if (!name) flag(tool, 'missing_name');
    if (nameKey) names.set(nameKey, [...(names.get(nameKey) || []), tool]);

    const description = String(tool.description || '').trim();
    if (!description) flag(tool, 'missing_description_tr');
    else if (description.length < 40)
      flag(tool, 'short_description_tr', String(description.length));
    if (!String(tool.description_en || '').trim()) flag(tool, 'missing_description_en');
    if (!tool.category_id) flag(tool, 'missing_category');
    if (!String(tool.pricing_model || '').trim()) flag(tool, 'missing_pricing');
    if (!Array.isArray(tool.platforms) || tool.platforms.length === 0)
      flag(tool, 'missing_platforms');
    if (!tool.embedding) flag(tool, 'missing_embedding');

    const link = String(tool.link || '').trim();
    if (!link) {
      flag(tool, 'missing_link');
    } else {
      try {
        const url = new URL(link);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
        const domain = url.hostname.toLowerCase().replace(/^www\./, '');
        domains.set(domain, [...(domains.get(domain) || []), tool]);
      } catch {
        flag(tool, 'invalid_link_format', link);
      }
    }
    if (tool.link_check_status === 'invalid') flag(tool, 'broken_link_confirmed');
    else if (tool.link_check_status === 'review') flag(tool, 'link_needs_review');
  }

  for (const [key, group] of names) {
    if (group.length > 1) for (const tool of group) flag(tool, 'duplicate_name', key);
  }
  for (const [domain, group] of domains) {
    if (group.length > 1) for (const tool of group) flag(tool, 'shared_domain_review', domain);
  }

  const counts = Object.fromEntries(
    [...new Set(issues.map((issue) => issue.type))]
      .sort()
      .map((type) => [type, issues.filter((issue) => issue.type === type).length])
  );
  return {
    totalTools: tools.length,
    approvedTools: approved.length,
    embeddingCoverage: approved.length
      ? (approved.length - (counts.missing_embedding || 0)) / approved.length
      : null,
    counts,
    issues,
  };
}

async function fetchAllTools(sb) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await sb
      .from('tools')
      .select(
        'id,name,slug,description,description_en,link,is_approved,pricing_model,platforms,category_id,embedding,link_check_status'
      )
      .order('id', { ascending: true })
      .range(from, from + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL ve Supabase service key gerekli.');
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const report = {
    generatedAt: new Date().toISOString(),
    ...analyzeCatalog(await fetchAllTools(sb)),
  };
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  if (outputArg)
    await writeFile(outputArg.slice('--output='.length), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
