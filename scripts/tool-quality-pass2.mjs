#!/usr/bin/env node
/**
 * Second-pass catalog quality:
 * - Fix remaining obvious mis-categories (D-ID Creative Reality Studio, etc.)
 * - Report empty/short/duplicate/generic descriptions
 * - Optional --apply for high-confidence category moves
 *
 *   node scripts/tool-quality-pass2.mjs --dry-run
 *   node scripts/tool-quality-pass2.mjs --apply
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnv({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const { classifyToolText, normalizeProductKey } = await import(
  pathToFileURL(join(root, 'src/lib/categoryTaxonomy.js')).href
);

const APPLY = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing Supabase env');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

/** High-confidence manual overrides by exact name (lowercased) */
const MANUAL_BY_NAME = {
  'creative reality studio': 'video-uretim', // D-ID talking video
  'ailipsync.studio': 'video-uretim',
  'ai lip sync': 'video-uretim',
  'd-id': 'video-uretim',
  'limewire ai studio': 'gorsel-uretim', // AI image generation, not music
  'coqui studio': 'ses-muzik', // voice/TTS
  'recast studio': 'video-uretim', // repurposes video/podcast into short clips
  figma: 'tasarim',
  'remove.bg': 'gorsel-uretim',
  trello: 'uretkenlik',
  'monday.com': 'uretkenlik',
  evernote: 'uretkenlik',
  tableau: 'veri-analiz',
  semrush: 'pazarlama',
  brandwatch: 'pazarlama',
  'reclaim.ai': 'uretkenlik',
  'x.ai': 'uretkenlik', // meeting scheduling historically; product may vary
  sumly: 'metin-yazarligi',
  'openai gpt-3': 'chatbotlar',
  'simplified ai writer': 'metin-yazarligi',
  'simplified ai video editor': 'video-uretim',
  closerscopy: 'metin-yazarligi',
  'code climate': 'kod-yazilim',
  appcode: 'kod-yazilim',
  'appcode.com': 'kod-yazilim',
  testim: 'kod-yazilim',
  mabl: 'kod-yazilim',
  applitools: 'kod-yazilim',
  functionize: 'kod-yazilim',
  virtuoso: 'kod-yazilim',
  sealights: 'kod-yazilim',
  parasoft: 'kod-yazilim',
  'reply.io': 'satis-crm',
  outreach: 'satis-crm',
  'logomaster.ai': 'tasarim',
  'design ai': 'tasarim',
  'tailor brands': 'tasarim',
  'colorwise.io': 'tasarim',
  'diagram.ai': 'tasarim',
  avatarify: 'video-uretim',
  'magic eraser': 'gorsel-uretim',
  'vmake.ai': 'video-uretim',
  imgupscaler: 'gorsel-uretim',
  'zyro ai image upscaler': 'gorsel-uretim',
  'neural love ai image upscaler': 'gorsel-uretim',
  'icons8 smart upscaler': 'gorsel-uretim',
  'myheritage deep nostalgia': 'gorsel-uretim',
};

async function fetchAllTools() {
  const page = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await sb
      .from('tools')
      .select(
        'id,name,slug,description,description_en,link,is_approved,pricing_model,platforms,category_id,categories(id,name,slug)'
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

async function fetchCategories() {
  const { data, error } = await sb.from('categories').select('id,name,slug');
  if (error) throw error;
  return new Map(data.map((c) => [c.slug, c]));
}

function isAudioish(text) {
  return /music|müzik|muzik|audio|ses|voice|tts|speech|podcast|elevenlabs|suno|\budio\b|song|şarkı|sarki|sound|soundtrack|beat|radio|radyo|dubbing|dublaj|whisper|asr|\bstt\b|text.to.speech|speech.to.text|voice.?clon/i.test(
    text
  );
}

function isVideoish(text) {
  return /video|film|animat|talking head|lip.?sync|deepfake|avatar.*video|konuşan video|konusan video|text to video|runway|pika|heygen|synthesia|d-id|did\.com/i.test(
    text
  );
}

async function main() {
  console.log(APPLY ? 'MODE: APPLY' : 'MODE: DRY-RUN');
  const tools = await fetchAllTools();
  const cats = await fetchCategories();
  const approved = tools.filter((t) => t.is_approved);

  const emptyDesc = approved.filter((t) => !String(t.description || '').trim());
  const shortDesc = approved.filter((t) => {
    const d = String(t.description || '').trim();
    return d.length > 0 && d.length < 40;
  });
  const noLink = approved.filter((t) => !t.link);
  const badLink = approved.filter((t) => t.link && !/^https?:\/\//i.test(t.link));
  const genericTemplate = approved.filter((t) =>
    /üzerinden erişilebilen bir yapay zeka aracıdır/i.test(t.description || '')
  );
  const engOnly = approved.filter((t) => {
    const d = t.description || '';
    if (d.length < 60) return false;
    const hasTr =
      /[çğıöşüÇĞİÖŞÜ]/.test(d) ||
      /\b(ve|bir|için|olan|ile|olarak|aracı|yapay|süreç|yardımcı)\b/i.test(d);
    return !hasTr;
  });

  const byName = new Map();
  for (const t of approved) {
    const k = t.name.toLowerCase().trim();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(t);
  }
  const dups = [...byName.entries()].filter(([, v]) => v.length > 1);

  console.log('\n=== HEALTH ===');
  console.log({
    total: tools.length,
    approved: approved.length,
    emptyDesc: emptyDesc.length,
    shortDesc: shortDesc.length,
    noLink: noLink.length,
    badLink: badLink.length,
    genericTemplate: genericTemplate.length,
    engOnlyDesc: engOnly.length,
    duplicateNames: dups.length,
  });
  if (emptyDesc.length) console.log('EMPTY', emptyDesc.map((t) => t.name));
  if (shortDesc.length) {
    console.log(
      'SHORT',
      shortDesc.slice(0, 20).map((t) => ({ name: t.name, len: t.description.length }))
    );
  }
  if (dups.length) {
    console.log(
      'DUPS',
      dups.slice(0, 15).map(([name, list]) => ({
        name,
        ids: list.map((x) => x.id),
        cats: list.map((x) => x.categories?.slug),
      }))
    );
  }
  if (badLink.length) {
    console.log(
      'BAD_LINK',
      badLink.map((t) => ({ name: t.name, link: t.link }))
    );
  }
  console.log(
    'ENG_SAMPLE',
    engOnly.slice(0, 10).map((t) => ({
      name: t.name,
      cat: t.categories?.slug,
      desc: t.description.slice(0, 90),
    }))
  );

  const categoryMoves = [];

  for (const tool of approved) {
    const nameKey = normalizeProductKey(tool.name);
    const current = tool.categories?.slug || null;
    const blob = `${tool.name} ${tool.description || ''} ${tool.link || ''}`;
    let target = MANUAL_BY_NAME[nameKey] || null;
    let reason = target ? `manual:${target}` : null;

    // Studio leftovers: video talking-head tools stuck in ses-muzik
    if (!target && current === 'ses-muzik') {
      if (isVideoish(blob) && !isAudioish(blob.replace(/lip.?sync/gi, ' '))) {
        target = 'video-uretim';
        reason = 'ses-muzik→video (talking video / lip-sync studio)';
      } else if (!isAudioish(blob) && !isVideoish(blob)) {
        const pred = classifyToolText(tool.name, tool.description, tool.link);
        if (pred.score >= 3 && pred.slug !== 'ses-muzik') {
          target = pred.slug;
          reason = `ses-muzik non-audio → ${pred.slug} (${pred.matched.join(',')})`;
        }
      }
    }

    // Known-name classifier wins
    if (!target) {
      const pred = classifyToolText(tool.name, tool.description, tool.link);
      if (
        pred.matched.some((m) => m.startsWith('known:')) &&
        current &&
        pred.slug !== current
      ) {
        target = pred.slug;
        reason = `known:${pred.matched.join(',')}`;
      }
    }

    if (target && target !== current && cats.has(target)) {
      categoryMoves.push({
        id: tool.id,
        name: tool.name,
        from: current,
        to: target,
        categoryId: cats.get(target).id,
        reason,
      });
    }
  }

  console.log('\n=== CATEGORY MOVES ===', categoryMoves.length);
  for (const m of categoryMoves) {
    console.log(`  ${m.name}: ${m.from} → ${m.to} (${m.reason})`);
  }

  // ses-muzik full list
  console.log('\n=== SES_MUZIK LIST ===');
  for (const t of approved.filter((t) => t.categories?.slug === 'ses-muzik')) {
    console.log(`  - ${t.name}: ${(t.description || '').slice(0, 100)}`);
  }

  if (!APPLY) {
    console.log('\nDry-run only. Use --apply to write category moves.');
    return;
  }

  let ok = 0;
  let err = 0;
  for (const m of categoryMoves) {
    const { error } = await sb.from('tools').update({ category_id: m.categoryId }).eq('id', m.id);
    if (error) {
      console.error('fail', m.name, error.message);
      err += 1;
    } else {
      ok += 1;
    }
  }
  console.log('\nAPPLIED', { ok, err });

  // verify key tools
  const names = categoryMoves.map((m) => m.name);
  if (names.length) {
    const { data } = await sb
      .from('tools')
      .select('name,categories(slug)')
      .in(
        'id',
        categoryMoves.map((m) => m.id)
      );
    console.log('VERIFY', data);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
