/**
 * Pack runner smoke wrapper.
 * Runs offline pack eval (always). Logs whether Partner/Gemini env is present
 * for optional live LLM source observation in the same suite (falls back to local).
 *
 * Usage: npm run kasif:pack-smoke
 */
import { spawnSync } from 'node:child_process';

const hasPartner = Boolean(
  process.env.KASIF_PARTNER_API_URL && process.env.KASIF_PARTNER_API_KEY
);
const hasGemini = Boolean(process.env.GEMINI_API_KEY);

console.log(
  JSON.stringify({
    event: 'kasif_pack_smoke_start',
    hasPartner,
    hasGemini,
    note: 'runPack uses Partner → Gemini → local; without keys, expect source=local',
  })
);

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['jest', '__tests__/lib/kasif-pack-addtool-eval.test.js', '--ci', '--coverage=false'],
  { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' }
);

const code = typeof result.status === 'number' ? result.status : 1;
console.log(
  JSON.stringify({
    event: 'kasif_pack_smoke_done',
    ok: code === 0,
    exitCode: code,
  })
);
process.exit(code);