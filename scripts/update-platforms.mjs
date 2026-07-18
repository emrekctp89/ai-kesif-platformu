#!/usr/bin/env node
/**
 * Sadece "Web" (veya boş) platformu olan araçları gerçekçi platform listesiyle günceller.
 *
 *   node scripts/update-platforms.mjs --dry-run
 *   node scripts/update-platforms.mjs --apply
 *   node scripts/update-platforms.mjs --apply --gemini --limit=200
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

loadEnv({ path: '.env.local' });

const ALLOWED = new Set([
  'Web',
  'iOS',
  'Android',
  'Windows',
  'macOS',
  'Linux',
  'Chrome Uzantısı',
]);

/** Bilinen araçlar → platformlar (Web her zaman dahil edilebilir) */
const KNOWN = {
  chatgpt: ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
  'chat gpt': ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
  'openai': ['Web', 'iOS', 'Android'],
  claude: ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
  'google gemini': ['Web', 'iOS', 'Android'],
  gemini: ['Web', 'iOS', 'Android'],
  midjourney: ['Web'],
  'notion ai': ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
  notion: ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
  'github copilot': ['Web', 'Windows', 'macOS', 'Linux'],
  copilot: ['Web', 'Windows', 'macOS', 'Linux', 'iOS', 'Android'],
  cursor: ['Windows', 'macOS', 'Linux'],
  replit: ['Web', 'iOS', 'Android'],
  tabnine: ['Windows', 'macOS', 'Linux', 'Web'],
  codeium: ['Windows', 'macOS', 'Linux', 'Web', 'Chrome Uzantısı'],
  windsurf: ['Windows', 'macOS', 'Linux'],
  grammarly: ['Web', 'iOS', 'Android', 'Windows', 'macOS', 'Chrome Uzantısı'],
  quillbot: ['Web', 'Chrome Uzantısı', 'Windows', 'macOS'],
  jasper: ['Web'],
  'copy.ai': ['Web'],
  canva: ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
  figma: ['Web', 'Windows', 'macOS'],
  runway: ['Web', 'Windows', 'macOS'],
  'runway ml': ['Web', 'Windows', 'macOS'],
  pika: ['Web'],
  leonardo: ['Web'],
  'leonardo ai': ['Web'],
  elevenlabs: ['Web', 'iOS', 'Android'],
  suno: ['Web', 'iOS', 'Android'],
  'suno ai': ['Web', 'iOS', 'Android'],
  udio: ['Web'],
  perplexity: ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
  'character.ai': ['Web', 'iOS', 'Android'],
  faceapp: ['iOS', 'Android', 'Web'],
  'face app': ['iOS', 'Android', 'Web'],
  duolingo: ['Web', 'iOS', 'Android'],
  synthesia: ['Web'],
  heygen: ['Web'],
  descript: ['Web', 'Windows', 'macOS'],
  otter: ['Web', 'iOS', 'Android'],
  'otter.ai': ['Web', 'iOS', 'Android'],
  fireflies: ['Web', 'Chrome Uzantısı'],
  zapier: ['Web'],
  make: ['Web'],
  n8n: ['Web', 'Windows', 'macOS', 'Linux'],
  adobe: ['Web', 'Windows', 'macOS', 'iOS', 'Android'],
  firefly: ['Web', 'Windows', 'macOS'],
  gamma: ['Web'],
  tome: ['Web'],
  uizard: ['Web'],
  framer: ['Web', 'macOS'],
  'v0 by vercel': ['Web'],
  v0: ['Web'],
  krea: ['Web'],
  'krea ai': ['Web'],
  claude: ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
  grok: ['Web', 'iOS', 'Android'],
  deepseek: ['Web', 'iOS', 'Android'],
  mistral: ['Web'],
  phind: ['Web', 'Chrome Uzantısı'],
  poe: ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
  'you.com': ['Web', 'Chrome Uzantısı'],
  hubspot: ['Web', 'iOS', 'Android'],
  intercom: ['Web'],
  zendesk: ['Web', 'iOS', 'Android'],
  shopify: ['Web', 'iOS', 'Android'],
  darktrace: ['Web'],
  snyk: ['Web', 'Windows', 'macOS', 'Linux'],
  hirevue: ['Web', 'iOS', 'Android'],
  meshy: ['Web'],
  'inworld ai': ['Web'],
  'ready player me': ['Web'],
  elicit: ['Web'],
  consensus: ['Web'],
  'harvey ai': ['Web'],
  'julius ai': ['Web'],
  abridge: ['Web', 'iOS'],
  gong: ['Web'],
  retool: ['Web'],
  kapa: ['Web'],
  feathery: ['Web'],
  heuristica: ['Web'],
  humata: ['Web'],
  kling: ['Web', 'iOS', 'Android'],
  'kling ai': ['Web', 'iOS', 'Android'],
  luma: ['Web', 'iOS'],
  'luma ai': ['Web', 'iOS'],
  'luma ai dream machine': ['Web'],
  kaiber: ['Web'],
  ideogram: ['Web'],
  flux: ['Web'],
  stable: ['Web'],
  huggingface: ['Web'],
  'beautiful.ai': ['Web'],
  writesonic: ['Web'],
  rytr: ['Web'],
  surfer: ['Web', 'Chrome Uzantısı'],
  surferseo: ['Web', 'Chrome Uzantısı'],
  semrush: ['Web', 'Chrome Uzantısı'],
  ahrefs: ['Web', 'Chrome Uzantısı'],
  adcreative: ['Web'],
  ocoya: ['Web'],
  scribe: ['Web', 'Chrome Uzantısı', 'Windows', 'macOS'],
  'paradox olivia': ['Web', 'iOS', 'Android'],
  'ada support': ['Web'],
  ramp: ['Web', 'iOS', 'Android'],
  khanmigo: ['Web'],
  'google bard': ['Web', 'iOS', 'Android'],
  'microsoft copilot': ['Web', 'Windows', 'macOS', 'iOS', 'Android'],
  'bing chat': ['Web', 'Windows', 'macOS', 'iOS', 'Android'],
  'github copilot': ['Web', 'Windows', 'macOS', 'Linux'],
  slack: ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
  discord: ['Web', 'iOS', 'Android', 'Windows', 'macOS', 'Linux'],
  loom: ['Web', 'Chrome Uzantısı', 'Windows', 'macOS', 'iOS', 'Android'],
  photopea: ['Web'],
  'remove.bg': ['Web'],
  photoroom: ['Web', 'iOS', 'Android'],
  picsart: ['Web', 'iOS', 'Android'],
  capcut: ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
};

function parseArgs(argv) {
  const options = { dryRun: true, gemini: false, limit: 250, forceAll: false };
  for (const arg of argv) {
    if (arg === '--apply') options.dryRun = false;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--gemini') options.gemini = true;
    else if (arg === '--force-all') options.forceAll = true;
    else if (arg.startsWith('--limit=')) options.limit = Number(arg.split('=')[1]) || 250;
  }
  return options;
}

function normalizePlatforms(list) {
  const out = [];
  for (const raw of list || []) {
    let p = String(raw || '').trim();
    if (!p) continue;
    // common aliases
    const lower = p.toLowerCase();
    if (lower === 'chrome' || lower === 'chrome extension' || lower === 'extension')
      p = 'Chrome Uzantısı';
    if (lower === 'mac' || lower === 'osx' || lower === 'macos') p = 'macOS';
    if (lower === 'win' || lower === 'windows') p = 'Windows';
    if (lower === 'iphone' || lower === 'ipad' || lower === 'ios') p = 'iOS';
    if (lower === 'android') p = 'Android';
    if (lower === 'linux') p = 'Linux';
    if (lower === 'web' || lower === 'browser' || lower === 'saas') p = 'Web';
    if (ALLOWED.has(p) && !out.includes(p)) out.push(p);
  }
  if (!out.length) out.push('Web');
  // Web-first sort preference for display consistency
  const order = ['Web', 'iOS', 'Android', 'Windows', 'macOS', 'Linux', 'Chrome Uzantısı'];
  return out.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function platformsEqual(a, b) {
  const na = normalizePlatforms(a).join('|');
  const nb = normalizePlatforms(b).join('|');
  return na === nb;
}

function isWebOnly(platforms) {
  if (!Array.isArray(platforms) || platforms.length === 0) return true;
  return platforms.length === 1 && platforms[0] === 'Web';
}

function normalizeNameKey(name) {
  return String(name || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[®™]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kelime sınırlı / güvenli bilinen-ad eşlemesi (Canvas≠Canva) */
function inferFromKnown(name) {
  const key = normalizeNameKey(name);
  if (!key) return null;
  if (KNOWN[key]) return { platforms: normalizePlatforms(KNOWN[key]), source: 'known-exact' };

  // drop brand suffixes for exact-ish match
  const stripped = key
    .replace(/\s+(ai|app|labs|io|hq|inc|llc|platform|studio)$/i, '')
    .trim();
  if (stripped && KNOWN[stripped]) {
    return { platforms: normalizePlatforms(KNOWN[stripped]), source: 'known-exact' };
  }

  // longest keys first; require whole-token match (no substring traps like canva⊂canvas)
  const keys = Object.keys(KNOWN).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (k.length < 4) continue;
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, 'i');
    if (re.test(key)) {
      return { platforms: normalizePlatforms(KNOWN[k]), source: `known:${k}` };
    }
  }
  return null;
}

function inferFromText(name, description, link) {
  const text = `${name} ${description} ${link}`.toLocaleLowerCase('tr-TR');
  const found = new Set(['Web']);

  if (
    /\b(ios|iphone|ipad|app store|apple app)\b/i.test(text) ||
    text.includes('ios app') ||
    text.includes('iphone')
  ) {
    found.add('iOS');
  }
  if (/\b(android|play store|google play)\b/i.test(text)) {
    found.add('Android');
  }
  if (/\b(windows|win32|win64|\.exe)\b/i.test(text)) {
    found.add('Windows');
  }
  if (/\b(macos|mac os|os x|osx|\.dmg)\b/i.test(text)) {
    found.add('macOS');
  }
  if (/\b(linux|ubuntu|debian|appimage)\b/i.test(text)) {
    found.add('Linux');
  }
  if (
    /\b(chrome extension|chrome web store|tarayıcı eklent|chrome uzant|browser extension)\b/i.test(
      text
    )
  ) {
    found.add('Chrome Uzantısı');
  }
  if (/\b(desktop|masaüstü|native app|electron)\b/i.test(text)) {
    found.add('Windows');
    found.add('macOS');
  }
  if (/\b(mobile app|mobil uygulama|smartphone)\b/i.test(text)) {
    found.add('iOS');
    found.add('Android');
  }
  if (/\b(cross-?platform|çok platform|multi-?platform)\b/i.test(text)) {
    found.add('iOS');
    found.add('Android');
    found.add('Windows');
    found.add('macOS');
  }
  // IDE / code assistants tend to be desktop
  if (/\b(ide|vs code|jetbrains|neovim|vim plugin|code editor)\b/i.test(text)) {
    found.add('Windows');
    found.add('macOS');
    found.add('Linux');
  }

  const platforms = normalizePlatforms([...found]);
  if (platforms.length === 1 && platforms[0] === 'Web') {
    return null;
  }
  return { platforms, source: 'text-heuristic' };
}

function resolvePlatforms(tool) {
  const known = inferFromKnown(tool.name);
  if (known) return known;

  const text = inferFromText(tool.name, tool.description, tool.link);
  if (text) return text;

  return { platforms: ['Web'], source: 'web-default' };
}

async function fetchAllTools(sb) {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from('tools')
      .select('id,name,slug,link,description,platforms,is_approved')
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    from += 1000;
    if (data.length < 1000) break;
  }
  return all;
}

async function geminiFill(tools, limit) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY yok');
    return new Map();
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_TEXT_MODEL || 'gemini-flash-latest',
  });

  const batch = tools.slice(0, limit);
  const results = new Map();

  for (let i = 0; i < batch.length; i += 10) {
    const chunk = batch.slice(i, i + 10);
    const prompt = `AI araçları için kullanılabilir platformları belirle.
İzinli değerler: Web, iOS, Android, Windows, macOS, Linux, Chrome Uzantısı
Kurallar:
- Web tabanlı SaaS ise "Web" ekle.
- Resmi mobil uygulaması varsa iOS/Android ekle.
- Masaüstü uygulaması varsa Windows/macOS/Linux ekle.
- Chrome eklentisi varsa "Chrome Uzantısı" ekle.
- Emin değilsen sadece ["Web"] yaz.
- Uydurma; yaygın bilinen ürün bilgisine dayan.
Sadece JSON dizi: [{"id":number,"platforms":["Web","iOS"]}]

Araçlar:
${JSON.stringify(
  chunk.map((t) => ({
    id: t.id,
    name: t.name,
    link: t.link,
    description: String(t.description || '').slice(0, 160),
  }))
)}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result?.response?.text?.() || '';
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) continue;
      const parsed = JSON.parse(match[0]);
      for (const row of parsed) {
        if (!row?.id || !Array.isArray(row.platforms)) continue;
        const platforms = normalizePlatforms(row.platforms);
        results.set(row.id, { platforms, source: 'gemini' });
      }
      process.stdout.write(`  gemini batch ${i / 10 + 1}: +${parsed.length}\n`);
      await new Promise((r) => setTimeout(r, 350));
    } catch (err) {
      console.warn('  gemini error:', err.message || err);
    }
  }

  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log(`\n=== Update Platforms (${options.dryRun ? 'DRY-RUN' : 'APPLY'}) ===\n`);

  const tools = await fetchAllTools(sb);
  const targets = tools.filter((t) => options.forceAll || isWebOnly(t.platforms));
  console.log(`total tools: ${tools.length}`);
  console.log(`web-only (or empty) targets: ${targets.length}`);

  const planned = [];
  const stillWeb = [];

  for (const tool of targets) {
    const resolved = resolvePlatforms(tool);
    if (!platformsEqual(tool.platforms, resolved.platforms)) {
      planned.push({
        id: tool.id,
        name: tool.name,
        from: tool.platforms,
        to: resolved.platforms,
        source: resolved.source,
      });
    } else if (resolved.source === 'web-default') {
      stillWeb.push(tool);
    }
  }

  console.log(`heuristic upgrades: ${planned.length}`);
  console.log(`still web-only after heuristic: ${stillWeb.length}`);

  // Gemini for remaining web-only
  if (options.gemini && stillWeb.length) {
    console.log(`\nGemini fill for up to ${options.limit} tools...`);
    const geminiMap = await geminiFill(stillWeb, options.limit);
    for (const tool of stillWeb) {
      const g = geminiMap.get(tool.id);
      if (!g) continue;
      if (platformsEqual(tool.platforms, g.platforms)) continue;
      // avoid planned duplicates
      if (planned.some((p) => p.id === tool.id)) continue;
      planned.push({
        id: tool.id,
        name: tool.name,
        from: tool.platforms,
        to: g.platforms,
        source: g.source,
      });
    }
  }

  // source breakdown
  const bySource = {};
  for (const p of planned) bySource[p.source] = (bySource[p.source] || 0) + 1;
  console.log('\nsources:', bySource);
  console.log('sample:', planned.slice(0, 12));

  let updated = 0;
  if (!options.dryRun) {
    for (const row of planned) {
      const { error } = await sb
        .from('tools')
        .update({
          platforms: row.to,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) {
        console.warn('fail', row.id, row.name, error.message);
        continue;
      }
      updated += 1;
    }
  } else {
    updated = planned.length;
  }

  // final stats if apply
  let finalStats = null;
  if (!options.dryRun) {
    const after = await fetchAllTools(sb);
    const webOnly = after.filter((t) => isWebOnly(t.platforms)).length;
    const multi = after.length - webOnly;
    finalStats = { total: after.length, webOnly, multiPlatform: multi };
  }

  console.log(
    '\n=== SUMMARY ===\n',
    JSON.stringify(
      {
        dryRun: options.dryRun,
        planned: planned.length,
        updated,
        bySource,
        finalStats,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
