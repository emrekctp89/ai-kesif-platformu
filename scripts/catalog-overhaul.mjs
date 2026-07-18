#!/usr/bin/env node
/**
 * Katalog overhaul:
 * 1) Primary kategorileri garanti et
 * 2) Araçları daraltılmış kategorilere yeniden sınıflandır
 * 3) Eksik pricing_model / platforms doldur
 * 4) Boş mikro kategorileri temizle
 * 5) (opsiyonel) Gemini ile zenginleştirme / keşif
 *
 *   node scripts/catalog-overhaul.mjs --dry-run
 *   node scripts/catalog-overhaul.mjs --apply
 *   node scripts/catalog-overhaul.mjs --apply --enrich --limit=80
 *   node scripts/catalog-overhaul.mjs --apply --discover --discover-limit=10
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnv({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const {
  PRIMARY_CATEGORIES,
  CATEGORY_MERGE_MAP,
  classifyToolText,
  PRIMARY_SLUGS,
} = await import(pathToFileURL(join(root, 'src/lib/categoryTaxonomy.js')).href);

// DB enum: pricing_model_enum — "Bilinmiyor" yok
const ALLOWED_PRICING = new Set([
  'Ücretsiz',
  'Freemium',
  'Abonelik',
  'Tek Seferlik Ödeme',
]);

/** Bilinen popüler araçlar için kaba fiyat sözlüğü */
const KNOWN_PRICING = {
  'chatgpt': 'Freemium',
  'openai': 'Freemium',
  'claude': 'Freemium',
  'gemini': 'Freemium',
  'midjourney': 'Abonelik',
  'notion ai': 'Freemium',
  'notion': 'Freemium',
  'github copilot': 'Abonelik',
  'copilot': 'Abonelik',
  'jasper': 'Abonelik',
  'copy.ai': 'Freemium',
  'grammarly': 'Freemium',
  'quillbot': 'Freemium',
  'canva': 'Freemium',
  'runway': 'Freemium',
  'elevenlabs': 'Freemium',
  'perplexity': 'Freemium',
  'cursor': 'Freemium',
  'replit': 'Freemium',
  'stable diffusion': 'Ücretsiz',
  'huggingface': 'Freemium',
  'leonardo': 'Freemium',
  'descript': 'Freemium',
  'otter.ai': 'Freemium',
  'fireflies': 'Freemium',
  'zapier': 'Freemium',
  'make': 'Freemium',
  'n8n': 'Freemium',
  'synthesia': 'Abonelik',
  'heygen': 'Freemium',
  'character.ai': 'Freemium',
  'adobe firefly': 'Freemium',
  'gamma': 'Freemium',
  'tome': 'Freemium',
  'beautiful.ai': 'Freemium',
  'writesonic': 'Freemium',
  'rytr': 'Freemium',
  'surfer': 'Abonelik',
  'semrush': 'Abonelik',
  'ahrefs': 'Abonelik',
  'tabnine': 'Freemium',
  'codeium': 'Freemium',
  'windsurf': 'Freemium',
  'suno': 'Freemium',
  'udio': 'Freemium',
  'pika': 'Freemium',
  'kling': 'Freemium',
  'luma': 'Freemium',
  'ideogram': 'Freemium',
  'flux': 'Freemium',
  'grok': 'Freemium',
  'deepseek': 'Freemium',
  'mistral': 'Freemium',
  'anthropic': 'Freemium',
  'phind': 'Freemium',
  'you.com': 'Freemium',
  'poe': 'Freemium',
  'huggingface chat': 'Ücretsiz',
};

function parseArgs(argv) {
  const options = {
    dryRun: true,
    enrich: false,
    discover: false,
    purgeEmpty: true,
    limit: 100,
    discoverLimit: 10,
  };

  for (const arg of argv) {
    if (arg === '--apply') options.dryRun = false;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--enrich') options.enrich = true;
    else if (arg === '--discover') options.discover = true;
    else if (arg === '--no-purge') options.purgeEmpty = false;
    else if (arg.startsWith('--limit=')) options.limit = Number(arg.split('=')[1]) || 100;
    else if (arg.startsWith('--discover-limit='))
      options.discoverLimit = Number(arg.split('=')[1]) || 10;
  }

  return options;
}

function inferPricing(name, description, link) {
  const key = String(name || '').toLocaleLowerCase('tr-TR').trim();
  for (const [known, model] of Object.entries(KNOWN_PRICING)) {
    if (key === known || key.includes(known) || known.includes(key)) {
      return model;
    }
  }

  const text = `${name} ${description} ${link}`.toLocaleLowerCase('tr-TR');
  if (text.includes('freemium')) return 'Freemium';
  if (/(one[- ]time|tek sefer|lifetime|ömür boyu)/i.test(text)) return 'Tek Seferlik Ödeme';
  if (/(subscription|abonelik|monthly|yearly|aylık|yıllık)/i.test(text)) return 'Abonelik';
  if (/(ücretsiz|free plan|free tier)\b/i.test(text)) {
    if (/(pro|premium|paid|ücretli)/i.test(text)) return 'Freemium';
    return 'Ücretsiz';
  }
  return null;
}

function slugifyName(name) {
  return String(name || '')
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function fetchAllTools(sb) {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from('tools')
      .select(
        'id,name,slug,link,description,category_id,pricing_model,platforms,is_approved,technical_details'
      )
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    from += 1000;
    if (data.length < 1000) break;
  }
  return all;
}

async function ensurePrimaryCategories(sb, dryRun) {
  const { data: existing, error } = await sb.from('categories').select('id,name,slug');
  if (error) throw error;

  const bySlug = new Map((existing || []).map((c) => [c.slug, c]));
  const toInsert = [];

  for (const primary of PRIMARY_CATEGORIES) {
    if (!bySlug.has(primary.slug)) {
      toInsert.push({ name: primary.name, slug: primary.slug });
    } else if (bySlug.get(primary.slug).name !== primary.name) {
      console.log(
        `  rename ${primary.slug}: "${bySlug.get(primary.slug).name}" → "${primary.name}"`
      );
      if (!dryRun) {
        await sb
          .from('categories')
          .update({ name: primary.name })
          .eq('slug', primary.slug);
      }
    }
  }

  // Fix typo slug tasarm → keep row but tools will move to tasarim
  if (bySlug.has('tasarm') && bySlug.has('tasarim')) {
    console.log('  note: legacy slug "tasarm" will be purged after tool reassignment');
  }

  if (toInsert.length) {
    console.log(`  insert ${toInsert.length} primary categories:`, toInsert.map((c) => c.slug));
    if (!dryRun) {
      const { error: insertError } = await sb.from('categories').insert(toInsert);
      if (insertError) throw insertError;
    }
  } else {
    console.log('  all primary categories already present');
  }

  const { data: refreshed } = await sb.from('categories').select('id,name,slug');
  return new Map((refreshed || existing || []).map((c) => [c.slug, c]));
}

function pickTargetSlug(tool, categoriesById) {
  const current = categoriesById.get(tool.category_id);
  const currentSlug = current?.slug;

  // Keyword / known-tool classification preferred
  const classified = classifyToolText(tool.name, tool.description, tool.link);

  if (classified.score >= 3) {
    return {
      slug: classified.slug,
      reason: `keywords:${classified.matched.slice(0, 3).join(',')}`,
      score: classified.score,
    };
  }

  // Special: old gorsel-video bucket — prefer video if description hints video
  if (currentSlug === 'gorsel-video') {
    const text = `${tool.name} ${tool.description}`.toLocaleLowerCase('tr-TR');
    if (/(video|animat|film|runway|pika|sora|kling|luma|kaiber|heygen|synthesia)/i.test(text)) {
      return { slug: 'video-uretim', reason: 'gorsel-video→video-hint', score: 4 };
    }
    return { slug: 'gorsel-uretim', reason: 'gorsel-video→image', score: 3 };
  }

  // Fall back to merge map of current category
  if (currentSlug && CATEGORY_MERGE_MAP[currentSlug]) {
    return {
      slug: CATEGORY_MERGE_MAP[currentSlug],
      reason: `merge:${currentSlug}`,
      score: 1,
    };
  }

  if (currentSlug && PRIMARY_SLUGS.has(currentSlug)) {
    return { slug: currentSlug, reason: 'already-primary', score: 2 };
  }

  if (classified.score > 0) {
    return {
      slug: classified.slug,
      reason: `weak-keywords:${classified.matched.join(',')}`,
      score: classified.score,
    };
  }

  return { slug: 'diger', reason: 'fallback', score: 0 };
}

async function reclassifyTools(sb, tools, slugToCategory, categoriesById, dryRun) {
  const moves = [];
  const distribution = {};

  for (const tool of tools) {
    const pick = pickTargetSlug(tool, categoriesById);
    const target = slugToCategory.get(pick.slug) || slugToCategory.get('diger');
    if (!target) continue;

    distribution[pick.slug] = (distribution[pick.slug] || 0) + 1;

    if (tool.category_id !== target.id) {
      moves.push({
        id: tool.id,
        name: tool.name,
        from: categoriesById.get(tool.category_id)?.slug || tool.category_id,
        to: pick.slug,
        reason: pick.reason,
      });
    }
  }

  console.log(`  tools to move: ${moves.length} / ${tools.length}`);
  console.log('  target distribution:', distribution);

  if (!dryRun && moves.length) {
    // batch updates by target category
    const byTarget = new Map();
    for (const m of moves) {
      if (!byTarget.has(m.to)) byTarget.set(m.to, []);
      byTarget.get(m.to).push(m.id);
    }

    for (const [slug, ids] of byTarget) {
      const cat = slugToCategory.get(slug);
      // chunk 100
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { error } = await sb
          .from('tools')
          .update({ category_id: cat.id, updated_at: new Date().toISOString() })
          .in('id', chunk);
        if (error) throw error;
      }
      console.log(`  updated ${ids.length} tools → ${slug}`);
    }
  } else if (dryRun) {
    console.log('  sample moves:', moves.slice(0, 15));
  }

  return { moves, distribution };
}

async function fillPricing(sb, tools, dryRun, enrichWithGemini, limit) {
  let updated = 0;
  let inferred = 0;
  let geminiFilled = 0;
  const missing = tools.filter((t) => !t.pricing_model);

  console.log(`  missing pricing: ${missing.length}`);

  const toUpdate = [];

  for (const tool of missing) {
    const price = inferPricing(tool.name, tool.description, tool.link);
    if (price && ALLOWED_PRICING.has(price)) {
      toUpdate.push({ id: tool.id, pricing_model: price, source: 'heuristic' });
      inferred += 1;
    }
  }

  // Gemini for remaining if requested
  const stillMissing = missing.filter((t) => !toUpdate.some((u) => u.id === t.id));
  if (enrichWithGemini && stillMissing.length) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('  GEMINI_API_KEY yok; Gemini zenginleştirme atlandı');
    } else {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_TEXT_MODEL || 'gemini-flash-latest',
      });
      const batch = stillMissing.slice(0, limit);

      for (let i = 0; i < batch.length; i += 8) {
        const chunk = batch.slice(i, i + 8);
        const prompt = `Aşağıdaki AI araçları için yalnızca bilinen/yaygın fiyat modelini tahmin et.
İzinli değerler: Ücretsiz | Freemium | Abonelik | Tek Seferlik Ödeme
Emin değilsen o aracı atla (listeye ekleme). Sadece JSON dizi döndür: [{"id":number,"pricing_model":"..."}]

Araçlar:
${JSON.stringify(
  chunk.map((t) => ({
    id: t.id,
    name: t.name,
    link: t.link,
    description: String(t.description || '').slice(0, 180),
  }))
)}`;

        try {
          const result = await model.generateContent(prompt);
          const text = result?.response?.text?.() || '';
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (!jsonMatch) continue;
          const parsed = JSON.parse(jsonMatch[0]);
          for (const row of parsed) {
            if (!row?.id || !ALLOWED_PRICING.has(row.pricing_model)) continue;
            toUpdate.push({
              id: row.id,
              pricing_model: row.pricing_model,
              source: 'gemini',
            });
            geminiFilled += 1;
          }
          // gentle rate limit
          await new Promise((r) => setTimeout(r, 400));
        } catch (err) {
          console.warn('  gemini batch error:', err.message || err);
        }
      }
    }
  }

  // Also ensure platforms
  const platformFixes = tools.filter(
    (t) => !Array.isArray(t.platforms) || t.platforms.length === 0
  );
  console.log(`  missing platforms: ${platformFixes.length}`);

  if (!dryRun) {
    for (const row of toUpdate) {
      const { error } = await sb
        .from('tools')
        .update({
          pricing_model: row.pricing_model,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) {
        console.warn('  price update fail', row.id, error.message);
        continue;
      }
      updated += 1;
    }

    for (const tool of platformFixes) {
      await sb
        .from('tools')
        .update({ platforms: ['Web'], updated_at: new Date().toISOString() })
        .eq('id', tool.id);
    }
  } else {
    console.log(
      '  sample pricing fills:',
      toUpdate.slice(0, 12).map((u) => `${u.id}:${u.pricing_model}(${u.source})`)
    );
    updated = toUpdate.length;
  }

  return { updated, inferred, geminiFilled, candidates: toUpdate.length };
}

async function purgeEmptyNonPrimary(sb, dryRun) {
  const { data: cats } = await sb.from('categories').select('id,name,slug');
  const tools = await fetchAllTools(sb);
  const used = new Set(tools.map((t) => t.category_id));

  const removable = (cats || []).filter(
    (c) => !PRIMARY_SLUGS.has(c.slug) && !used.has(c.id)
  );

  console.log(`  empty non-primary categories: ${removable.length}`);

  if (!dryRun && removable.length) {
    // delete in chunks
    for (let i = 0; i < removable.length; i += 50) {
      const ids = removable.slice(i, i + 50).map((c) => c.id);
      const { error } = await sb.from('categories').delete().in('id', ids);
      if (error) {
        console.warn('  purge error:', error.message);
      }
    }
    console.log(`  deleted ${removable.length} empty categories`);
  } else {
    console.log(
      '  sample purge:',
      removable.slice(0, 12).map((c) => c.slug)
    );
  }

  return removable.length;
}

async function discoverTools(sb, slugToCategory, dryRun, limit) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('  GEMINI_API_KEY yok; discovery atlandı');
    return { inserted: 0 };
  }

  const existing = await fetchAllTools(sb);
  const existingNames = new Set(
    existing.map((t) => String(t.name || '').toLocaleLowerCase('tr-TR'))
  );
  const existingLinks = new Set(
    existing.map((t) => {
      try {
        const u = new URL(t.link);
        return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
      } catch {
        return String(t.link || '').toLowerCase();
      }
    })
  );

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_TEXT_MODEL || 'gemini-flash-latest',
  });

  const categoryNames = PRIMARY_CATEGORIES.map((c) => c.name).join(', ');
  const sampleExisting = existing
    .slice(0, 200)
    .map((t) => t.name)
    .join(', ');

  const prompt = `Sen AI araç dizini editörüsün. Gerçek, popüler ve resmî sitesi olan AI araçları öner.
Kategoriler: ${categoryNames}
Zaten listede olanlar (tekrarlama): ${sampleExisting}

${limit} yeni araç öner. Sadece JSON:
{
  "tools": [
    {
      "name": "...",
      "description": "Türkçe 90-220 karakter",
      "link": "https://official-site.example",
      "category": "yukarıdaki kategorilerden biri",
      "pricing_model": "Ücretsiz|Freemium|Abonelik|Tek Seferlik Ödeme|Bilinmiyor",
      "platforms": ["Web"],
      "features": ["...","...","..."],
      "use_cases": ["...","..."],
      "target_users": ["..."]
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.() || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn('  discovery: JSON parse failed');
    return { inserted: 0 };
  }

  let payload;
  try {
    payload = JSON.parse(jsonMatch[0]);
  } catch {
    console.warn('  discovery: invalid JSON');
    return { inserted: 0 };
  }

  const candidates = Array.isArray(payload.tools) ? payload.tools : [];
  const nameToSlug = new Map(PRIMARY_CATEGORIES.map((c) => [c.name.toLocaleLowerCase('tr-TR'), c.slug]));
  // also match by partial
  for (const c of PRIMARY_CATEGORIES) {
    nameToSlug.set(c.slug, c.slug);
  }

  const rows = [];
  for (const raw of candidates) {
    const name = String(raw.name || '').trim();
    const description = String(raw.description || '').trim();
    let link = String(raw.link || '').trim();
    if (!name || name.length < 2 || description.length < 60) continue;
    if (!/^https?:\/\//i.test(link)) link = `https://${link}`;
    try {
      // eslint-disable-next-line no-new
      new URL(link);
    } catch {
      continue;
    }

    const nameKey = name.toLocaleLowerCase('tr-TR');
    if (existingNames.has(nameKey)) continue;
    let linkKey;
    try {
      const u = new URL(link);
      linkKey = `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
    } catch {
      continue;
    }
    if (existingLinks.has(linkKey)) continue;

    // category
    let catSlug =
      nameToSlug.get(String(raw.category || '').toLocaleLowerCase('tr-TR')) ||
      classifyToolText(name, description, link).slug;
    if (!PRIMARY_SLUGS.has(catSlug)) catSlug = 'diger';
    const cat = slugToCategory.get(catSlug) || slugToCategory.get('diger');
    if (!cat) continue;

    let pricing = raw.pricing_model;
    if (!ALLOWED_PRICING.has(pricing)) {
      pricing = inferPricing(name, description, link) || null;
    }

    const features = Array.isArray(raw.features) ? raw.features.slice(0, 5) : [];
    const useCases = Array.isArray(raw.use_cases) ? raw.use_cases.slice(0, 5) : [];
    const targets = Array.isArray(raw.target_users) ? raw.target_users.slice(0, 4) : [];
    const technical = [
      features.length ? `Öne çıkan özellikler:\n${features.map((f) => `- ${f}`).join('\n')}` : '',
      useCases.length ? `Kullanım alanları:\n${useCases.map((f) => `- ${f}`).join('\n')}` : '',
      targets.length ? `Kimler için uygun:\n${targets.map((f) => `- ${f}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const slug = slugifyName(name) || `ai-tool-${Date.now()}`;
    rows.push({
      name,
      description,
      link,
      slug,
      category_id: cat.id,
      pricing_model: pricing,
      platforms: Array.isArray(raw.platforms) && raw.platforms.length ? raw.platforms : ['Web'],
      is_approved: true,
      tier: 'Normal',
      technical_details: technical || null,
      suggester_email: 'catalog-overhaul@aikesif.com',
    });
  }

  console.log(`  discovery candidates accepted: ${rows.length}`);
  if (dryRun) {
    console.log(
      '  sample:',
      rows.slice(0, 8).map((r) => `${r.name} → cat ${r.category_id} (${r.pricing_model})`)
    );
    return { inserted: 0, candidates: rows.length };
  }

  let inserted = 0;
  for (const row of rows) {
    // unique slug
    let slug = row.slug;
    let n = 2;
    while (existing.some((t) => t.slug === slug) || rows.filter((r) => r.slug === slug).length > 1) {
      // handled below with insert error retry
      break;
    }

    const { error } = await sb.from('tools').insert(row);
    if (error) {
      // retry slug conflict
      if (String(error.message || '').includes('slug') || error.code === '23505') {
        row.slug = `${slug}-${n}`;
        const retry = await sb.from('tools').insert(row);
        if (retry.error) {
          console.warn('  insert fail', row.name, retry.error.message);
          continue;
        }
      } else {
        console.warn('  insert fail', row.name, error.message);
        continue;
      }
    }
    inserted += 1;
    existingNames.add(row.name.toLocaleLowerCase('tr-TR'));
  }

  return { inserted, candidates: rows.length };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('Supabase env eksik');
    process.exit(1);
  }

  const sb = createClient(url, key);
  console.log(`\n=== Catalog Overhaul (${options.dryRun ? 'DRY-RUN' : 'APPLY'}) ===\n`);

  console.log('1) Ensure primary categories');
  const slugToCategory = await ensurePrimaryCategories(sb, options.dryRun);

  const { data: allCats } = await sb.from('categories').select('id,name,slug');
  const categoriesById = new Map((allCats || []).map((c) => [c.id, c]));
  // refresh slug map after ensure
  for (const c of allCats || []) slugToCategory.set(c.slug, c);

  console.log('\n2) Reclassify tools');
  const tools = await fetchAllTools(sb);
  console.log(`  total tools: ${tools.length}`);
  const reclass = await reclassifyTools(sb, tools, slugToCategory, categoriesById, options.dryRun);

  console.log('\n3) Fill missing pricing / platforms');
  // refresh tools after reclass if applied
  const toolsForPricing = options.dryRun ? tools : await fetchAllTools(sb);
  const pricing = await fillPricing(
    sb,
    toolsForPricing,
    options.dryRun,
    options.enrich,
    options.limit
  );

  let purged = 0;
  if (options.purgeEmpty) {
    console.log('\n4) Purge empty non-primary categories');
    purged = await purgeEmptyNonPrimary(sb, options.dryRun);
  }

  let discovery = { inserted: 0 };
  if (options.discover) {
    console.log('\n5) Discover new tools');
    // refresh slug map
    const { data: cats2 } = await sb.from('categories').select('id,name,slug');
    const map2 = new Map((cats2 || []).map((c) => [c.slug, c]));
    discovery = await discoverTools(sb, map2, options.dryRun, options.discoverLimit);
  }

  console.log('\n=== SUMMARY ===');
  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        reclassified: reclass.moves.length,
        distribution: reclass.distribution,
        pricing,
        purged,
        discovery,
        primaryCount: PRIMARY_CATEGORIES.length,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
