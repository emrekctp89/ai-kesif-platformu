#!/usr/bin/env node
/**
 * Araç verisi kalite denetimi + onarım
 *
 * - Açıklama encoding kaçakları (?, mojibake, HTML entity, control char)
 * - Bilinen kategori yanlışları (udio ⊆ Studio vb.)
 * - Güçlü sınıflandırma sinyali ile kategori yeniden atama
 *
 *   node scripts/tool-data-quality.mjs --dry-run
 *   node scripts/tool-data-quality.mjs --apply
 *   node scripts/tool-data-quality.mjs --apply --limit=50
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnv({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const { classifyToolText } = await import(
  pathToFileURL(join(root, 'src/lib/categoryTaxonomy.js')).href
);

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

/** Deterministic repairs for the common seed template corruption */
const DESCRIPTION_FIXES = [
  [/\?zerinden/g, 'üzerinden'],
  [/eri\?ilebilen/g, 'erişilebilen'],
  [/arac\?d\?r/g, 'aracıdır'],
  [/G\?nl\?k/g, 'Günlük'],
  [/g\?nl\?k/g, 'günlük'],
  [/i\? ak\?\?lar\?nda/g, 'iş akışlarında'],
  [/ak\?\?lar\?nda/g, 'akışlarında'],
  [/h\?zl\?/g, 'hızlı'],
  [/verimli sonu\?/g, 'verimli sonuç'],
  [/sonu\? üret/g, 'sonuç üret'],
  [/sonu\? \?ret/g, 'sonuç üret'],
  [/\?retmeye/g, 'üretmeye'],
  [/yard\?mc\?/g, 'yardımcı'],
  // residual common fragments
  [/s\?re/g, 'süre'],
  [/i\?lem/g, 'işlem'],
  [/i\?birli/g, 'işbirli'],
  [/i\? /g, 'iş '],
  [/ i\?/g, ' iş'],
  [/d\?zen/g, 'düzen'],
  [/g\?r\?nt/g, 'görünt'],
  [/g\?rsel/g, 'görsel'],
  [/d\?n\?ş/g, 'dönüş'],
  [/i\?erik/g, 'içerik'],
  [/y\?net/g, 'yönet'],
  [/m\?şteri/g, 'müşteri'],
  [/üretkenli\?/g, 'üretkenliği'],
  [/verimlili\?/g, 'verimliliği'],
  [/kaliteyi art\?r/g, 'kaliteyi artır'],
  [/geli\?tir/g, 'geliştir'],
  [/anla\?ıl/g, 'anlaşıl'],
  [/olu\?tur/g, 'oluştur'],
  [/de\?erlendir/g, 'değerlendir'],
  [/ba\?ar/g, 'başar'],
  [/a\?a\?ı/g, 'aşağı'],
  [/yukar\?/g, 'yukarı'],
  [/s\?k/g, 'sık'],
  [/\?\?/g, 'ş'], // last-resort double-q often was şş/ş
];

/** High-confidence manual category overrides by slug or name */
const MANUAL_CATEGORY_BY_SLUG = {
  'visual-studio-code-ajxp7a': 'kod-yazilim',
  'visual-studio-code': 'kod-yazilim',
  copymatic: 'metin-yazarligi',
};

const MANUAL_CATEGORY_BY_NAME = {
  'visual studio code': 'kod-yazilim',
  vscode: 'kod-yazilim',
  'vs code': 'kod-yazilim',
  copymatic: 'metin-yazarligi',
};

async function fetchAllTools() {
  const page = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await sb
      .from('tools')
      .select(
        'id,name,slug,description,description_en,name_en,link,is_approved,category_id,categories(id,name,slug)'
      )
      .range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return all;
}

async function fetchCategoryMap() {
  const { data, error } = await sb.from('categories').select('id,name,slug');
  if (error) throw error;
  const bySlug = new Map(data.map((c) => [c.slug, c]));
  return bySlug;
}

function repairDescription(text) {
  if (!text || !text.includes('?')) return { text, changed: false };
  let next = text;
  for (const [re, rep] of DESCRIPTION_FIXES) {
    next = next.replace(re, rep);
  }
  // clean leftover isolated ? that sit inside Turkish letter clusters
  // e.g. "arac?" at end of word before punctuation already handled; leave URLs alone
  return { text: next, changed: next !== text };
}

function encodingReport(text, field) {
  if (!text) return [];
  const issues = [];
  if (text.includes('\uFFFD')) issues.push({ field, type: 'replacement_char' });
  if (/Ã.|Â.|Ä.|Å.|â€™|â€œ|â€|ðŸ/.test(text)) {
    issues.push({
      field,
      type: 'mojibake',
      sample: text.match(/.{0,12}(?:Ã.|Â.|â€™|ðŸ).{0,12}/)?.[0],
    });
  }
  if (/&(?:amp|lt|gt|quot|nbsp|#\d+|#x[0-9a-fA-F]+);/i.test(text)) {
    issues.push({ field, type: 'html_entity' });
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
    issues.push({ field, type: 'control_char' });
  }
  const qMarks = (text.match(/\?/g) || []).length;
  const qInWords = (text.match(/[A-Za-zÀ-ÿÇĞİÖŞÜçğıöşü]\?[A-Za-zÀ-ÿÇĞİÖŞÜçğıöşü]?/g) || [])
    .length;
  if (qMarks >= 2 && qInWords >= 1) {
    issues.push({ field, type: 'question_mark_corruption', qMarks });
  }
  return issues;
}

function resolveManualCategory(tool) {
  const slug = String(tool.slug || '').toLowerCase();
  const name = String(tool.name || '')
    .toLocaleLowerCase('tr-TR')
    .trim();
  if (MANUAL_CATEGORY_BY_SLUG[slug]) return MANUAL_CATEGORY_BY_SLUG[slug];
  if (MANUAL_CATEGORY_BY_NAME[name]) return MANUAL_CATEGORY_BY_NAME[name];
  for (const [key, cat] of Object.entries(MANUAL_CATEGORY_BY_NAME)) {
    if (name === key || name.includes(key)) return cat;
  }
  return null;
}

function summarizeTokenCorruption(tools) {
  const counts = new Map();
  for (const t of tools) {
    const d = t.description || '';
    if (!d.includes('?')) continue;
    const toks = d.match(/[^\s.,;:!()?[\]{}'"]*\?[^\s.,;:!()?[\]{}'"]*/g) || [];
    for (const tok of toks) counts.set(tok, (counts.get(tok) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
  console.log(APPLY ? 'MODE: APPLY' : 'MODE: DRY-RUN');
  const tools = await fetchAllTools();
  const categories = await fetchCategoryMap();
  console.log(`tools=${tools.length} categories=${categories.size}`);

  const encodingIssues = [];
  const descriptionRepairs = [];
  const categoryFixes = [];
  let residualAfterRepair = 0;

  for (const tool of tools) {
    for (const field of ['name', 'description', 'description_en', 'name_en']) {
      for (const issue of encodingReport(tool[field], field)) {
        encodingIssues.push({ id: tool.id, name: tool.name, slug: tool.slug, ...issue });
      }
    }

    const { text: repaired, changed } = repairDescription(tool.description || '');
    if (changed) {
      const stillBad = repaired.includes('?') && encodingReport(repaired, 'description').length > 0;
      if (stillBad) residualAfterRepair += 1;
      descriptionRepairs.push({
        id: tool.id,
        name: tool.name,
        slug: tool.slug,
        before: tool.description,
        after: repaired,
        residual: stillBad,
      });
    }

    const currentSlug = tool.categories?.slug || null;
    const manual = resolveManualCategory(tool);
    const predicted = classifyToolText(tool.name, repaired || tool.description, tool.link);

    let targetSlug = null;
    let reason = null;

    if (manual && manual !== currentSlug) {
      targetSlug = manual;
      reason = `manual:${manual}`;
    } else if (
      currentSlug &&
      predicted.slug !== currentSlug &&
      predicted.score >= 8 &&
      predicted.matched.some((m) => m.startsWith('known:'))
    ) {
      // only auto-move on known-name hits (high confidence)
      targetSlug = predicted.slug;
      reason = `known-reclass score=${predicted.score} matched=${predicted.matched.join(',')}`;
    } else if (
      currentSlug === 'ses-muzik' &&
      predicted.slug === 'kod-yazilim' &&
      predicted.score >= 4 &&
      /code|ide|developer|programming|yazılım|yazilim/i.test(
        `${tool.name} ${tool.description} ${tool.link}`
      )
    ) {
      targetSlug = 'kod-yazilim';
      reason = 'ses-muzik→kod-yazilim heuristic';
    }

    if (targetSlug && targetSlug !== currentSlug) {
      const cat = categories.get(targetSlug);
      if (cat) {
        categoryFixes.push({
          id: tool.id,
          name: tool.name,
          slug: tool.slug,
          from: currentSlug,
          to: targetSlug,
          categoryId: cat.id,
          reason,
        });
      }
    }
  }

  // unique encoding tools
  const encToolIds = new Set(encodingIssues.map((e) => e.id));
  const byType = encodingIssues.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  console.log('\n=== ENCODING ===');
  console.log('issue_rows=', encodingIssues.length, 'tools=', encToolIds.size, 'by_type=', byType);
  console.log('description_repairs=', descriptionRepairs.length, 'residual=', residualAfterRepair);
  console.log('top_corrupted_tokens:');
  for (const [tok, n] of summarizeTokenCorruption(tools).slice(0, 25)) {
    console.log(`  ${n}x ${tok}`);
  }

  console.log('\n=== CATEGORY FIXES ===');
  console.log('count=', categoryFixes.length);
  for (const f of categoryFixes.slice(0, 40)) {
    console.log(`  ${f.name}: ${f.from} → ${f.to} (${f.reason})`);
  }

  // preview repairs for Copymatic + VS Code
  const copy = descriptionRepairs.find((r) => /copymatic/i.test(r.name));
  const vscode = categoryFixes.find((f) => /visual studio code/i.test(f.name));
  if (copy) {
    console.log('\n=== COPYMATIC PREVIEW ===');
    console.log('BEFORE:', copy.before);
    console.log('AFTER :', copy.after);
  }
  if (vscode) {
    console.log('\n=== VS CODE PREVIEW ===');
    console.log(vscode);
  }

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to write changes.');
    return;
  }

  let appliedDesc = 0;
  let appliedCat = 0;
  let errors = 0;

  const descBatch = descriptionRepairs.filter((r) => !r.residual || true).slice(0, LIMIT);
  for (const r of descBatch) {
    // skip if residual still has many ? that we couldn't safely fix AND no improvement
    if (r.after === r.before) continue;
    const { error } = await sb.from('tools').update({ description: r.after }).eq('id', r.id);
    if (error) {
      console.error('desc fail', r.id, r.name, error.message);
      errors += 1;
    } else {
      appliedDesc += 1;
    }
  }

  const catBatch = categoryFixes.slice(0, LIMIT);
  for (const f of catBatch) {
    const { error } = await sb
      .from('tools')
      .update({ category_id: f.categoryId })
      .eq('id', f.id);
    if (error) {
      console.error('cat fail', f.id, f.name, error.message);
      errors += 1;
    } else {
      appliedCat += 1;
    }
  }

  console.log('\n=== APPLIED ===');
  console.log({ appliedDesc, appliedCat, errors });

  // post-verify key tools
  const { data: verify } = await sb
    .from('tools')
    .select('id,name,slug,description,categories(slug,name)')
    .or('name.ilike.%Visual Studio Code%,name.ilike.%Copymatic%');
  console.log('\n=== VERIFY ===');
  for (const t of verify || []) {
    console.log(
      JSON.stringify({
        name: t.name,
        cat: t.categories?.slug,
        desc: (t.description || '').slice(0, 180),
      })
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
