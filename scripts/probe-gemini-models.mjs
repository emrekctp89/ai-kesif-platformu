import { readFileSync } from 'node:fs';

function loadEnvLocal() {
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
    process.env[k] = String(v).replace(/\\n/g, '\n');
  }
}

loadEnvLocal();
const key = process.env.GEMINI_API_KEY;
const models = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview-05-20',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-flash-latest',
];

for (const m of models) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say hi in one word' }] }],
      }),
    }
  );
  const j = await r.json();
  console.log(
    m,
    r.status,
    j.error?.message?.slice(0, 90) || j.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 40)
  );
}
