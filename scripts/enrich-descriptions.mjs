#!/usr/bin/env node
/**
 * Batch-enrich low-quality tool descriptions with Gemini (Turkish).
 * Priority: generic seed templates → English-only → thin cards.
 *
 *   node scripts/enrich-descriptions.mjs --dry-run --limit=10
 *   node scripts/enrich-descriptions.mjs --apply --limit=40
 *   node scripts/enrich-descriptions.mjs --apply --limit=40 --only=template,english
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

loadEnv({ path: '.env.local' });

const ALLOWED_PRICING = new Set(['Ücretsiz', 'Freemium', 'Abonelik', 'Tek Seferlik Ödeme']);
const ALLOWED_PLATFORMS = new Set([
  'Web',
  'iOS',
  'Android',
  'Windows',
  'macOS',
  'Linux',
  'Chrome Uzantısı',
]);

const ENGLISH_HINT =
  /\b(the|and|with|for|that|this|from|your|using|create|allows|users|tool|platform|powered)\b/gi;
const TURKISH_HINT = /[çğıöşü]|\b(ve|ile|için|bir|bu|yapay|zeka|araç|kullanıcı)\b/gi;

function parseArgs(argv) {
  const options = {
    dryRun: true,
    limit: 25,
    only: null, // null | Set
    // Free tier is often ~5 RPM for flash; default ~13s keeps us under that.
    delayMs: 13000,
    maxRetries: 4,
  };
  for (const arg of argv) {
    if (arg === '--apply') options.dryRun = false;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--limit=')) options.limit = Math.max(1, Number(arg.split('=')[1]) || 25);
    else if (arg.startsWith('--delay=')) options.delayMs = Math.max(0, Number(arg.split('=')[1]) || 0);
    else if (arg.startsWith('--retries='))
      options.maxRetries = Math.max(0, Number(arg.split('=')[1]) || 0);
    else if (arg.startsWith('--only=')) {
      options.only = new Set(
        arg
          .slice('--only='.length)
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      );
    }
  }
  return options;
}

function parseRetryDelayMs(err) {
  const msg = String(err?.message || err || '');
  const retryInfo = msg.match(/retry in ([\d.]+)s/i);
  if (retryInfo) {
    return Math.ceil(Number(retryInfo[1]) * 1000) + 500;
  }
  if (/429|Too Many Requests|quota/i.test(msg)) return 25000;
  return null;
}

async function withRetries(fn, { maxRetries = 4 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const wait = parseRetryDelayMs(err);
      if (wait == null || attempt === maxRetries) throw err;
      process.stdout.write(`retry${attempt + 1}(+${Math.round(wait / 1000)}s) `);
      await sleep(wait);
    }
  }
  throw lastErr;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isGenericSeed(description) {
  const text = String(description || '');
  return (
    /üzerinden erişilebilen bir yapay zeka aracıdır/i.test(text) ||
    /günlük iş akışlarında daha hızlı ve verimli sonuç üretmeye yardımcı olur/i.test(text)
  );
}

function isEnglishDescription(description) {
  const text = String(description || '');
  if (text.length < 40) return false;
  const en = text.match(ENGLISH_HINT) || [];
  const tr = text.match(TURKISH_HINT) || [];
  return en.length >= 3 && en.length > tr.length * 1.5;
}

function priority(tool) {
  const d = tool.description || '';
  let p = 0;
  if (isGenericSeed(d)) p += 100;
  if (isEnglishDescription(d)) p += 80;
  if (d.length > 0 && d.length < 100) p += 40;
  if (!tool.technical_details) p += 25;
  if (!tool.pricing_model) p += 10;
  return p;
}

function matchesOnlyFilter(tool, only) {
  if (!only || only.size === 0) return true;
  const d = tool.description || '';
  if (only.has('template') && isGenericSeed(d)) return true;
  if (only.has('english') && isEnglishDescription(d)) return true;
  if (only.has('thin') && (!tool.technical_details || d.length < 100)) return true;
  return false;
}

function needsWork(tool) {
  const d = tool.description || '';
  return isGenericSeed(d) || isEnglishDescription(d) || d.length < 100 || !tool.technical_details;
}

function parseJsonFromText(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || raw;
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first === -1 || last <= first) throw new Error('JSON yok');
  return JSON.parse(candidate.slice(first, last + 1));
}

function buildTechnicalDetails(parsed) {
  const list = (arr, n) =>
    (Array.isArray(arr) ? arr : [])
      .map((x) => normalizeText(x))
      .filter(Boolean)
      .slice(0, n);
  const sections = [];
  const features = list(parsed.features, 5);
  const useCases = list(parsed.use_cases, 5);
  const targetUsers = list(parsed.target_users, 4);
  const limitations = list(parsed.limitations, 3);
  if (features.length) sections.push(`Öne çıkan özellikler:\n${features.map((i) => `- ${i}`).join('\n')}`);
  if (useCases.length) sections.push(`Kullanım alanları:\n${useCases.map((i) => `- ${i}`).join('\n')}`);
  if (targetUsers.length)
    sections.push(`Kimler için uygun:\n${targetUsers.map((i) => `- ${i}`).join('\n')}`);
  if (limitations.length)
    sections.push(`Dikkat edilmesi gerekenler:\n${limitations.map((i) => `- ${i}`).join('\n')}`);
  return sections.join('\n\n').slice(0, 1800) || null;
}

function qcTurkishDescription(text, toolName) {
  const d = normalizeText(text);
  if (d.length < 90 || d.length > 500) return { ok: false, reason: `length=${d.length}` };
  if (isEnglishDescription(d)) return { ok: false, reason: 'still_english' };
  if (isGenericSeed(d)) return { ok: false, reason: 'still_template' };
  if (/\?zerinden|eri\?ilebilen|arac\?d/.test(d)) return { ok: false, reason: 'encoding' };
  if (/[^\S\r\n]{3,}/.test(text)) return { ok: false, reason: 'weird_spacing' };
  // Must not just repeat the name
  if (d.toLowerCase() === String(toolName || '').toLowerCase()) {
    return { ok: false, reason: 'name_only' };
  }
  return { ok: true };
}

async function fetchAllApproved(sb) {
  const page = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await sb
      .from('tools')
      .select(
        'id,name,slug,link,description,description_en,pricing_model,platforms,technical_details,updated_at,categories(name,slug)'
      )
      .eq('is_approved', true)
      .range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return all;
}

function buildPrompt(tool) {
  return `
AI Keşif Platformu için araç kartı metni üret.

Kurallar:
- Açıklama MUTLAKA doğal Türkçe olsun (İngilizce bırakma).
- 130-320 karakter, abartısız, pazarlama cliché'siz.
- "X, domain üzerinden erişilebilen bir yapay zeka aracıdır" kalıbını KULLANMA.
- Emin olmadığın fiyatı boş bırakma; en makul seçeneği ver ama uydurma.
- Sadece geçerli JSON döndür.

Araç:
${JSON.stringify(
  {
    name: tool.name,
    link: tool.link,
    category: tool.categories?.name || '',
    current_description: tool.description || '',
    pricing_model: tool.pricing_model || '',
    platforms: tool.platforms || [],
  },
  null,
  2
)}

JSON:
{
  "description": "Türkçe kart açıklaması",
  "pricing_model": "Ücretsiz | Freemium | Abonelik | Tek Seferlik Ödeme",
  "platforms": ["Web","iOS","Android","Windows","macOS","Linux","Chrome Uzantısı"],
  "features": ["3-5 özellik"],
  "use_cases": ["3-5 kullanım"],
  "target_users": ["1-4 hedef kitle"],
  "limitations": ["0-3 uyarı"]
}
`.trim();
}

async function enrichOne(model, tool) {
  const result = await model.generateContent(buildPrompt(tool));
  const text = result?.response?.text?.();
  if (!text) throw new Error('boş yanıt');
  const parsed = parseJsonFromText(text);
  const description = normalizeText(parsed.description || '');
  const qc = qcTurkishDescription(description, tool.name);
  if (!qc.ok) throw new Error(`QC fail: ${qc.reason} :: ${description.slice(0, 80)}`);

  let pricing = normalizeText(parsed.pricing_model || '');
  if (!ALLOWED_PRICING.has(pricing)) pricing = tool.pricing_model || null;

  const platforms = (Array.isArray(parsed.platforms) ? parsed.platforms : [])
    .map((p) => normalizeText(p))
    .filter((p) => ALLOWED_PLATFORMS.has(p));
  const uniquePlatforms = [...new Set(platforms)].slice(0, 5);

  return {
    description,
    pricing_model: pricing,
    platforms: uniquePlatforms.length ? uniquePlatforms : tool.platforms || ['Web'],
    technical_details: buildTechnicalDetails(parsed),
  };
}

function buildUpdates(tool, enrichment) {
  const updates = {};
  const current = normalizeText(tool.description || '');
  if (enrichment.description && enrichment.description !== current) {
    updates.description = enrichment.description;
    if (isEnglishDescription(current) && !normalizeText(tool.description_en || '')) {
      updates.description_en = current;
    }
  }
  if (!tool.pricing_model && enrichment.pricing_model) {
    updates.pricing_model = enrichment.pricing_model;
  }
  const curPlat = Array.isArray(tool.platforms) ? tool.platforms : [];
  if (
    enrichment.platforms?.length &&
    (curPlat.length === 0 || (curPlat.length === 1 && curPlat[0] === 'Web'))
  ) {
    updates.platforms = enrichment.platforms;
  }
  if (
    enrichment.technical_details &&
    (!tool.technical_details || tool.technical_details.length < 120)
  ) {
    updates.technical_details = enrichment.technical_details;
  }
  return updates;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!url || !key) throw new Error('Supabase env eksik');
  if (!apiKey) throw new Error('GEMINI_API_KEY eksik');

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const genAI = new GoogleGenerativeAI(apiKey);
  // Free-tier flash/latest often hit 20 RPD; flash-lite family has separate quota.
  const modelName = process.env.GEMINI_TEXT_MODEL || 'gemini-3.1-flash-lite';
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction:
      'Sen AI araç dizini editörüsün. Kısa, doğru, doğal Türkçe ve yalnızca JSON üretirsin.',
  });

  console.log(
    options.dryRun ? 'MODE: DRY-RUN' : 'MODE: APPLY',
    `limit=${options.limit}`,
    `model=${modelName}`,
    options.only ? `only=${[...options.only].join(',')}` : 'only=all-priority'
  );

  const tools = await fetchAllApproved(sb);
  const candidates = tools
    .filter(needsWork)
    .filter((t) => matchesOnlyFilter(t, options.only))
    .map((t) => ({ ...t, priority: priority(t) }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, options.limit);

  console.log(`approved=${tools.length} candidates=${candidates.length}`);
  console.log(
    'bucket preview:',
    candidates.slice(0, 8).map((t) => ({
      name: t.name,
      p: t.priority,
      template: isGenericSeed(t.description),
      english: isEnglishDescription(t.description),
    }))
  );

  let updated = 0;
  let failed = 0;
  const samples = [];

  for (let i = 0; i < candidates.length; i += 1) {
    const tool = candidates[i];
    process.stdout.write(`[${i + 1}/${candidates.length}] ${tool.name} ... `);
    try {
      const enrichment = await withRetries(() => enrichOne(model, tool), {
        maxRetries: options.maxRetries,
      });
      const updates = buildUpdates(tool, enrichment);
      if (!Object.keys(updates).length) {
        console.log('no-op');
      } else {
        if (!options.dryRun) {
          const { error } = await sb
            .from('tools')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', tool.id);
          if (error) throw error;
        }

        updated += 1;
        console.log(
          `${options.dryRun ? 'would-update' : 'updated'} keys=${Object.keys(updates).join(',')}`
        );
        if (samples.length < 6 && updates.description) {
          samples.push({
            name: tool.name,
            before: (tool.description || '').slice(0, 120),
            after: updates.description,
          });
        }
      }
    } catch (err) {
      failed += 1;
      const msg = String(err.message || err);
      console.log('FAIL', msg.slice(0, 180));
    }

    if (options.delayMs && i < candidates.length - 1) {
      await sleep(options.delayMs);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log({ updated, failed, dryRun: options.dryRun });
  console.log('\n=== SAMPLES ===');
  for (const s of samples) {
    console.log(`\n# ${s.name}`);
    console.log('BEFORE:', s.before);
    console.log('AFTER :', s.after);
  }

  if (!options.dryRun) {
    // residual counts
    const again = await fetchAllApproved(sb);
    const residual = {
      template: again.filter((t) => isGenericSeed(t.description)).length,
      english: again.filter((t) => isEnglishDescription(t.description)).length,
    };
    console.log('\n=== RESIDUAL ===', residual);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
