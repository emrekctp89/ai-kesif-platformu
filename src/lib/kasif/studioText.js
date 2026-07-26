/**
 * Kâşif studio text generation — free-form writing for /studyo.
 * Chain: Partner → Gemini → deterministic local draft.
 */

import { callLlmText } from './partnerRunner';

function cleanPrompt(value) {
  return String(value || '')
    .trim()
    .slice(0, 2000);
}

/**
 * Offline-friendly draft when no LLM provider is available.
 * @param {string} userPrompt
 * @returns {string}
 */
export function buildLocalStudioText(userPrompt) {
  const topic = cleanPrompt(userPrompt) || 'AI araçları';
  return `## ${topic.slice(0, 80)}

### Açılış
${topic} hakkında net, pratik bir metin için önce okuyucunun işini tek cümlede sabitle:
"Bu metin, [hedef kitle] için [somut teslim] üretmeye yardım eder."

### Gövde iskeleti
1. **Sorun** — Bu hafta neden zaman/para kaybediliyor?
2. **Yaklaşım** — 3 adımlık mini iş akışı (hazırlık → üretim → kontrol).
3. **İlk çıktı** — 30 dakikada bitirilebilecek somut bir parça (başlık, post, e-posta, checklist…).
4. **Uyarı** — Fiyat, ücretsiz plan ve doğrulanmamış iddiaları abartma.

### Kapanış
Bir sonraki adımı yaz: hangi aracı deneyecek, hangi çıktıyı paylaşacak.

---
_Kâşif stüdyo yerel taslak — bulut model yokken iskelet üretir; dilini özelleştirip genişletebilirsin._`;
}

/**
 * @param {string} userPrompt
 * @returns {Promise<{ text: string, source: string }>}
 */
export async function generateStudioText(userPrompt) {
  const prompt = cleanPrompt(userPrompt);
  if (prompt.length < 3) {
    throw new Error('empty_prompt');
  }

  const system = `You are Kâşif, the writing assistant for AI Keşif (AI tools discovery platform).
Write clear, practical Turkish unless the user asks for another language.
Prefer concrete structure over fluff. Do not invent tool pricing or fake benchmarks.
Return only the requested text — no preamble about being an AI.`;

  try {
    const { text, source } = await callLlmText(
      `Kullanıcı isteği:\n${prompt}\n\nBu isteğe uygun, yaratıcı ve kullanışlı bir metin yaz.`,
      { system, temperature: 0.7, maxTokens: 2048 }
    );
    const cleaned = String(text || '')
      .replace(/^```(?:markdown|md|text)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    if (cleaned.length >= 40) {
      return { text: cleaned, source: source || 'partner' };
    }
  } catch {
    // fall through
  }

  return { text: buildLocalStudioText(prompt), source: 'local' };
}
