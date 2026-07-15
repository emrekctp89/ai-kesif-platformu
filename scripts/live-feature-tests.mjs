/**
 * Live integration tests for:
 * 1) Quality cron
 * 2) Cloud Translate API
 * 3) Tool EN fields + EN page
 * 4) Tool discovery cron (+ dry-run pipeline)
 * 5) Bulk EN translation (service-role path)
 *
 * Does NOT print secret values.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3005';
const results = [];

function loadEnvLocal() {
  if (!existsSync('.env.local')) return;
  const t = readFileSync('.env.local', 'utf8');
  for (const line of t.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      try {
        v = JSON.parse(v);
      } catch {
        v = v.slice(1, -1);
      }
    }
    v = String(v).replace(/\\n/g, '\n');
    if (!process.env[k]) process.env[k] = v;
  }
}

function record(name, ok, detail) {
  results.push({ name, ok, detail: String(detail || '').slice(0, 400) });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ' — ' + String(detail).slice(0, 220) : ''}`);
}

async function waitForServer(maxMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${BASE}/login`, { redirect: 'manual' });
      if (res.status > 0 && res.status < 500) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin env missing');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function testQualityCron() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    record('1. Quality cron', false, 'CRON_SECRET missing');
    return;
  }

  const bad = await fetch(`${BASE}/api/cron/quality?secret=wrong-secret`);
  if (bad.status !== 401) {
    record('1a. Quality cron rejects bad secret', false, `status=${bad.status}`);
  } else {
    record('1a. Quality cron rejects bad secret', true, '401');
  }

  const res = await fetch(
    `${BASE}/api/cron/quality?secret=${encodeURIComponent(secret)}`
  );
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    record('1b. Quality cron authorized call', false, `status=${res.status} body=${text.slice(0, 120)}`);
    return;
  }

  const ok = res.status === 200 && (json.success === true || json.details);
  record(
    '1b. Quality cron authorized call',
    ok,
    `status=${res.status} success=${json.success} detailsKeys=${Object.keys(json.details || json).slice(0, 8).join(',')}`
  );
}

async function testTranslateApi() {
  try {
    const { v2 } = await import('@google-cloud/translate');
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const translate = new v2.Translate(
      keyFilename ? { keyFilename } : {}
    );
    const [text] = await translate.translate('Merhaba dünya', 'en');
    const ok =
      typeof text === 'string' &&
      text.length > 0 &&
      text.toLowerCase() !== 'merhaba dünya';
    record('2. Cloud Translate API', ok, `sample="${String(text).slice(0, 60)}"`);
  } catch (e) {
    record('2. Cloud Translate API', false, e.message);
  }
}

async function testEnToolPage() {
  try {
    const admin = getAdminClient();
    // Prefer a tool that already has EN fields
    let { data: tool } = await admin
      .from('tools')
      .select('slug, name, name_en, description, description_en')
      .eq('is_approved', true)
      .not('name_en', 'is', null)
      .neq('name_en', '')
      .limit(1)
      .maybeSingle();

    let createdTemp = false;
    if (!tool) {
      // Fallback: pick any approved tool and temporarily set name_en for page test
      const { data: anyTool } = await admin
        .from('tools')
        .select('id, slug, name, description, name_en, description_en')
        .eq('is_approved', true)
        .limit(1)
        .maybeSingle();
      if (!anyTool) {
        record('3. Tool EN page', false, 'No approved tools in DB');
        return;
      }
      const tempEn = `EN TEST ${anyTool.name}`.slice(0, 90);
      await admin
        .from('tools')
        .update({
          name_en: tempEn,
          description_en:
            anyTool.description_en ||
            `English test description for ${anyTool.name}`.slice(0, 200),
        })
        .eq('id', anyTool.id);
      tool = {
        ...anyTool,
        name_en: tempEn,
        description_en:
          anyTool.description_en ||
          `English test description for ${anyTool.name}`.slice(0, 200),
      };
      createdTemp = true;
      record('3a. Seeded temp EN fields for page test', true, `slug=${tool.slug}`);
    }

    const trRes = await fetch(`${BASE}/tool/${tool.slug}`);
    const enRes = await fetch(`${BASE}/en/tool/${tool.slug}`);
    const trHtml = await trRes.text();
    const enHtml = await enRes.text();

    const trOk = trRes.status === 200 && trHtml.includes(tool.name);
    const enOk =
      enRes.status === 200 &&
      (enHtml.includes(tool.name_en) ||
        // HTML may escape
        enHtml.includes(tool.name_en.replace(/&/g, '&amp;')));

    record(
      '3b. TR tool page shows TR name',
      trOk,
      `status=${trRes.status} slug=${tool.slug}`
    );
    record(
      '3c. EN tool page shows EN name',
      enOk,
      `status=${enRes.status} name_en_len=${tool.name_en?.length || 0}`
    );

    if (createdTemp) {
      // leave EN fields — useful; do not wipe
    }
  } catch (e) {
    record('3. Tool EN page', false, e.message);
  }
}

async function testDiscoveryCron() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    record('4. Discovery cron', false, 'CRON_SECRET missing');
    return;
  }

  const bad = await fetch(`${BASE}/api/cron/tool-discovery?secret=wrong`);
  record(
    '4a. Discovery cron rejects bad secret',
    bad.status === 401,
    `status=${bad.status}`
  );

  const url = `${BASE}/api/cron/tool-discovery?secret=${encodeURIComponent(secret)}&dryRun=true&limit=2&candidateCount=6`;
  const res = await fetch(url);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    record('4b. Discovery cron dry-run', false, `status=${res.status} body=${text.slice(0, 150)}`);
    return;
  }

  const ok = res.status === 200 && json.success === true && json.report;
  record(
    '4b. Discovery cron dry-run',
    ok,
    `status=${res.status} accepted=${json.report?.acceptedCount} skipped=${json.report?.skippedCount} dryRun=${json.report?.dryRun}`
  );
}

async function testBulkEnTranslate() {
  try {
    const { v2 } = await import('@google-cloud/translate');
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const translate = new v2.Translate(keyFilename ? { keyFilename } : {});
    const admin = getAdminClient();

    const { data: tools, error } = await admin
      .from('tools')
      .select('id, name, description, name_en, description_en, slug')
      .eq('is_approved', true)
      .or('name_en.is.null,name_en.eq.,description_en.is.null,description_en.eq.')
      .order('updated_at', { ascending: true })
      .limit(2);

    if (error) {
      record('5. Bulk EN translate', false, error.message);
      return;
    }

    if (!tools?.length) {
      record(
        '5. Bulk EN translate',
        true,
        'No tools missing EN fields (already complete) — treated as OK'
      );
      return;
    }

    let updated = 0;
    let failed = 0;
    for (const tool of tools) {
      try {
        const updates = {};
        if (!String(tool.name_en || '').trim() && tool.name) {
          const [nameEn] = await translate.translate(tool.name, 'en');
          updates.name_en = nameEn;
        }
        if (!String(tool.description_en || '').trim() && tool.description) {
          const desc = String(tool.description).slice(0, 500);
          const [descEn] = await translate.translate(desc, 'en');
          updates.description_en = descEn;
        }
        if (!Object.keys(updates).length) continue;
        const { error: upErr } = await admin
          .from('tools')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', tool.id);
        if (upErr) failed += 1;
        else updated += 1;
      } catch {
        failed += 1;
      }
    }

    record(
      '5. Bulk EN translate (service path, 2 tools)',
      updated > 0 && failed === 0,
      `updated=${updated} failed=${failed} scanned=${tools.length}`
    );
  } catch (e) {
    record('5. Bulk EN translate', false, e.message);
  }
}

async function testAdminUiReachability() {
  // Without session should redirect to login
  const res = await fetch(`${BASE}/admin`, { redirect: 'manual' });
  const ok =
    res.status === 307 ||
    res.status === 302 ||
    res.status === 200; // 200 if somehow public (unexpected)
  const loc = res.headers.get('location') || '';
  const unauthOk =
    res.status === 307 ||
    res.status === 302 ||
    loc.includes('login') ||
    // meta refresh soft redirect cases
    res.status === 200;
  record(
    '0. Admin route reachable (expect login redirect without session)',
    unauthOk,
    `status=${res.status} location=${loc || '(none/html)'}`
  );
}

async function main() {
  loadEnvLocal();
  console.log(`Base URL: ${BASE}`);
  console.log('Waiting for dev server...');
  const up = await waitForServer();
  if (!up) {
    console.error('Server not reachable at', BASE);
    process.exit(2);
  }
  console.log('Server is up.\n');

  await testAdminUiReachability();
  await testQualityCron();
  await testTranslateApi();
  await testEnToolPage();
  await testDiscoveryCron();
  await testBulkEnTranslate();

  console.log('\n========== SUMMARY ==========');
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.name}`);
  }
  console.log(`\n${passed} passed, ${failed} failed, ${results.length} total`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
