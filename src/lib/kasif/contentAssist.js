/**
 * Kâşif content assist — title / summary / outline / polish for creator studio.
 *
 * Chain: Partner API → Gemini → deterministic local draft (same pattern as pack runners).
 * Local path is always available so the editor never hard-depends on an external key.
 */

import { plainTextFromMarkdown } from '@/lib/contentCreatorRules';
import { callLlmText } from './partnerRunner';

export const CREATOR_ASSIST_MODES = new Set(['description', 'outline', 'title', 'improve']);

const CLICKBAIT_RE =
  /\b(şok|inanılmaz|mutlaka|kaçırma|click here|you won'?t believe|must see)\b/i;

function clean(value, max = 8000) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, max);
}

function stripAssistNoise(text) {
  return String(text || '')
    .replace(/^```(?:markdown|md|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim();
}

function extractHeadings(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const headings = [];
  for (const line of lines) {
    const m = line.match(/^\s{0,3}(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const title = m[2].replace(/[*_`]/g, '').trim();
    if (title) headings.push({ level: m[1].length, title: title.slice(0, 120) });
  }
  return headings.slice(0, 12);
}

function firstSentences(plain, maxChars = 180) {
  const text = String(plain || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const parts = text.split(/(?<=[.!?…])\s+/).filter(Boolean);
  let out = '';
  for (const part of parts) {
    const next = out ? `${out} ${part}` : part;
    if (next.length > maxChars && out) break;
    out = next;
    if (out.length >= Math.min(120, maxChars)) break;
  }
  return out.slice(0, maxChars).trim();
}

function detectContentShape(title, plain) {
  const hay = `${title} ${plain}`.toLocaleLowerCase('tr-TR');
  if (/\b(vs\.?|karşılaştır|compare|comparison|alternatif)\b/.test(hay)) return 'comparison';
  if (/\b(nasıl|adım adım|tutorial|rehber|guide|how to)\b/.test(hay)) return 'tutorial';
  if (/\b(en iyi|best|list|liste|top \d+)\b/.test(hay)) return 'listicle';
  if (/\b(nedir|what is|tanım|overview)\b/.test(hay)) return 'explainer';
  return 'general';
}

function titleCaseLight(s, locale) {
  const words = String(s || '')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '';
  // Keep Turkish mostly as-is; only capitalize first letter of the phrase.
  if (locale !== 'en') {
    const joined = words.join(' ');
    return joined.charAt(0).toLocaleUpperCase('tr-TR') + joined.slice(1);
  }
  const small = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'of', 'to', 'in', 'on', 'with']);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && small.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function polishTitleLocal(title, plain, locale) {
  let base = clean(title, 120);
  if (!base || base.length < 6) {
    const seed =
      firstSentences(plain, 70) ||
      (locale === 'en' ? 'AI tools guide' : 'AI araçları rehberi');
    base = seed.replace(/[.!?…]+$/, '');
  }

  base = base
    .replace(/\s+/g, ' ')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/\b(blog|yazı|post)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Soft specificity: if very short and body exists, append a practical angle.
  if (base.length < 28 && plain && plain.length > 60) {
    const shape = detectContentShape(base, plain);
    const suffix =
      locale === 'en'
        ? {
            comparison: 'compared',
            tutorial: 'step by step',
            listicle: 'in 2026',
            explainer: 'explained',
            general: 'practical guide',
          }[shape]
        : {
            comparison: 'karşılaştırması',
            tutorial: 'adım adım',
            listicle: '2026 rehberi',
            explainer: 'nedir?',
            general: 'pratik rehber',
          }[shape];
    if (suffix && !base.toLocaleLowerCase('tr-TR').includes(suffix.toLocaleLowerCase('tr-TR'))) {
      base = `${base} — ${suffix}`;
    }
  }

  base = titleCaseLight(base, locale).slice(0, 80);
  return base || (locale === 'en' ? 'Practical AI tools guide' : 'Pratik AI araçları rehberi');
}

function buildLocalDescription({ title, description, contentPlain, locale }) {
  const existing = clean(description, 280);
  if (existing.length >= 40 && existing.length <= 180 && !CLICKBAIT_RE.test(existing)) {
    return existing.replace(/\s+/g, ' ').slice(0, 180);
  }

  const fromBody = firstSentences(contentPlain, 160);
  const topic = clean(title, 80) || (locale === 'en' ? 'this guide' : 'bu rehber');

  let text = fromBody;
  if (!text || text.length < 40) {
    text =
      locale === 'en'
        ? `A practical look at ${topic}: who it helps, how to start, and what to ship first.`
        : `${topic} için pratik bir bakış: kime uygun, nasıl başlanır ve ilk teslim ne olmalı.`;
  }

  // Prefer ending with a period for SEO snippets.
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > 180) text = `${text.slice(0, 177).replace(/\s+\S*$/, '')}…`;
  if (!/[.!?…]$/.test(text)) text = `${text}.`;
  return text.slice(0, 180);
}

function buildLocalOutline({ title, content, contentPlain, locale }) {
  const headings = extractHeadings(content);
  const shape = detectContentShape(title, contentPlain);
  const topic = clean(title, 100) || (locale === 'en' ? 'AI tools workflow' : 'AI araç iş akışı');

  if (headings.length >= 3) {
    const lines =
      locale === 'en'
        ? [
            `## Outline for “${topic}”`,
            '',
            '### Strengthen these sections',
            ...headings.slice(0, 8).map((h) => `- ${h.title}`),
            '',
            '### Suggested additions',
            '- Who this is for (and who it is not for)',
            '- Pricing / free-tier caveats',
            '- First output you can produce in 30 minutes',
            '- FAQ (2–3 real objections)',
          ]
        : [
            `## “${topic}” için taslak`,
            '',
            '### Güçlendirilecek bölümler',
            ...headings.slice(0, 8).map((h) => `- ${h.title}`),
            '',
            '### Önerilen ekler',
            '- Kime uygun (ve kime değil)',
            '- Fiyat / ücretsiz plan uyarıları',
            '- 30 dakikada üretilebilecek ilk çıktı',
            '- SSS (2–3 gerçek itiraz)',
          ];
    return lines.join('\n');
  }

  const shapes = {
    en: {
      comparison: [
        `## ${topic}`,
        '',
        '### Intro hook',
        'State the decision the reader needs to make in one sentence.',
        '',
        '### Comparison criteria',
        '- Use case fit',
        '- Output quality',
        '- Speed / learning curve',
        '- Pricing & free tier',
        '',
        '### Side-by-side notes',
        '#### Option A',
        '#### Option B',
        '',
        '### Recommendation',
        'One clear pick + when to choose the alternative.',
        '',
        '### FAQ',
        '- Can I mix both tools?',
        '- What breaks at free tier?',
      ],
      tutorial: [
        `## ${topic}`,
        '',
        '### What you will finish',
        'Name the concrete deliverable.',
        '',
        '### Prerequisites',
        '- Account / plan notes',
        '- Sample input',
        '',
        '### Steps',
        '1. Prep inputs',
        '2. Generate first draft',
        '3. Refine quality checks',
        '4. Publish / export',
        '',
        '### Common mistakes',
        '- …',
        '',
        '### Tips & next experiment',
      ],
      listicle: [
        `## ${topic}`,
        '',
        '### Who this list is for',
        '',
        '### Quick ranking criteria',
        '',
        '### 1) Tool name',
        '**What it does** · **Best for** · **Pricing note**',
        '',
        '### 2) Tool name',
        '',
        '### 3) Tool name',
        '',
        '### How to choose',
        '- Budget-first',
        '- Quality-first',
        '- Speed-first',
        '',
        '### Bottom line',
      ],
      explainer: [
        `## ${topic}`,
        '',
        '### Plain-language definition',
        '',
        '### Why it matters now',
        '',
        '### How it works (simple model)',
        '',
        '### When to use it',
        '',
        '### Related tools on the platform',
        '',
        '### Next step',
      ],
      general: [
        `## ${topic}`,
        '',
        '### Hook',
        'Why this problem costs time this week.',
        '',
        '### Core idea',
        '',
        '### Practical workflow',
        '1. …',
        '2. …',
        '3. …',
        '',
        '### Tool notes (verified claims only)',
        '',
        '### Checklist / first output',
        '',
        '### Wrap-up',
      ],
    },
    tr: {
      comparison: [
        `## ${topic}`,
        '',
        '### Giriş kancası',
        'Okuyucunun vermesi gereken kararı tek cümlede yaz.',
        '',
        '### Karşılaştırma ölçütleri',
        '- İşe uygunluk',
        '- Çıktı kalitesi',
        '- Hız / öğrenme eğrisi',
        '- Fiyat ve ücretsiz plan',
        '',
        '### Yan yana notlar',
        '#### Seçenek A',
        '#### Seçenek B',
        '',
        '### Tavsiye',
        'Net bir birincil seçim + alternatif ne zaman.',
        '',
        '### SSS',
        '- İkisini birlikte kullanabilir miyim?',
        '- Ücretsiz planda ne kırılır?',
      ],
      tutorial: [
        `## ${topic}`,
        '',
        '### Ne bitireceksin?',
        'Somut teslimi adlandır.',
        '',
        '### Ön koşullar',
        '- Hesap / plan notları',
        '- Örnek girdi',
        '',
        '### Adımlar',
        '1. Girdileri hazırla',
        '2. İlk taslağı üret',
        '3. Kalite kontrolleri',
        '4. Dışa aktar / yayınla',
        '',
        '### Sık hatalar',
        '- …',
        '',
        '### İpuçları ve sonraki deney',
      ],
      listicle: [
        `## ${topic}`,
        '',
        '### Bu liste kime?',
        '',
        '### Hızlı sıralama ölçütleri',
        '',
        '### 1) Araç adı',
        '**Ne yapar** · **Kime** · **Fiyat notu**',
        '',
        '### 2) Araç adı',
        '',
        '### 3) Araç adı',
        '',
        '### Nasıl seçilir?',
        '- Bütçe öncelikli',
        '- Kalite öncelikli',
        '- Hız öncelikli',
        '',
        '### Sonuç',
      ],
      explainer: [
        `## ${topic}`,
        '',
        '### Sade tanım',
        '',
        '### Neden şimdi önemli?',
        '',
        '### Nasıl çalışır? (basit model)',
        '',
        '### Ne zaman kullanılır?',
        '',
        '### Platformdaki ilgili araçlar',
        '',
        '### Sonraki adım',
      ],
      general: [
        `## ${topic}`,
        '',
        '### Kanca',
        'Bu sorunun bu hafta neden zaman kaybettirdiği.',
        '',
        '### Ana fikir',
        '',
        '### Pratik iş akışı',
        '1. …',
        '2. …',
        '3. …',
        '',
        '### Araç notları (yalnızca doğrulanabilir iddia)',
        '',
        '### Kontrol listesi / ilk çıktı',
        '',
        '### Kapanış',
      ],
    },
  };

  const pack = locale === 'en' ? shapes.en : shapes.tr;
  return (pack[shape] || pack.general).join('\n');
}

function buildLocalImprove({ title, content, locale }) {
  const raw = String(content || '');
  if (!raw.trim()) {
    return locale === 'en'
      ? `# ${title || 'Draft'}\n\nStart with the problem, then one concrete workflow and a first deliverable.`
      : `# ${title || 'Taslak'}\n\nÖnce sorunu yaz, sonra tek bir somut iş akışı ve ilk teslimi ekle.`;
  }

  let text = raw
    // collapse 3+ blank lines
    .replace(/\n{3,}/g, '\n\n')
    // trim trailing spaces per line
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();

  // Ensure a top-level heading if none exists and title is present.
  if (title && !/^#\s+/m.test(text)) {
    text = `# ${clean(title, 100)}\n\n${text}`;
  }

  // Soft readability: break very long paragraphs at sentence boundaries (light touch).
  text = text
    .split(/\n\n+/)
    .map((block) => {
      if (block.startsWith('#') || block.startsWith('-') || block.startsWith('*') || block.startsWith('```')) {
        return block;
      }
      if (block.length < 420) return block;
      const sentences = block.split(/(?<=[.!?…])\s+/);
      if (sentences.length < 3) return block;
      const mid = Math.ceil(sentences.length / 2);
      return `${sentences.slice(0, mid).join(' ')}\n\n${sentences.slice(mid).join(' ')}`;
    })
    .join('\n\n');

  return text;
}

/**
 * Deterministic Kâşif assist (no external API).
 * @param {{ mode: string, title?: string, description?: string, content?: string, locale?: string }} input
 */
export function buildLocalContentAssist(input = {}) {
  const mode = String(input.mode || '').trim();
  const locale = String(input.locale || 'tr').startsWith('en') ? 'en' : 'tr';
  const title = clean(input.title, 300);
  const description = clean(input.description, 800);
  const content = String(input.content || '');
  const contentPlain = plainTextFromMarkdown(content).slice(0, 6000);

  if (mode === 'title') {
    return polishTitleLocal(title, contentPlain, locale);
  }
  if (mode === 'description') {
    return buildLocalDescription({ title, description, contentPlain, locale });
  }
  if (mode === 'outline') {
    return buildLocalOutline({ title, content, contentPlain, locale });
  }
  if (mode === 'improve') {
    return buildLocalImprove({ title, content, locale });
  }
  return '';
}

function systemForMode(mode, locale) {
  const lang =
    locale === 'en'
      ? 'Write in clear, natural English.'
      : 'Türkçe, akıcı ve doğal bir dilde yaz.';
  const base = `You are Kâşif, the editorial AI for AI Keşif (an AI tools discovery platform). ${lang}
Return ONLY the requested text — no preamble, no quotes around the whole answer, no markdown fences unless the mode asks for headings.
Never invent product claims, pricing, or benchmarks that are not in the user material.
Prefer practical, specific language over marketing fluff. Avoid clickbait.`;

  if (mode === 'outline') {
    return `${base} Use Markdown headings (## and ###) and short bullet points.`;
  }
  if (mode === 'improve') {
    return `${base} Keep existing Markdown structure. Improve clarity and flow only; do not rewrite into a different article.`;
  }
  return base;
}

function userPromptForMode(mode, { title, description, content, contentPlain, locale }) {
  if (mode === 'description') {
    return `Write a short SEO-friendly summary (max 160 characters, hard cap 180) for this post on an AI tools platform.
Title: ${title || '(none)'}
Body excerpt: ${contentPlain || '(empty)'}
Current description: ${description || '(none)'}
Rules: one or two sentences; no hashtags; no clickbait; end with a period when natural.
Locale hint: ${locale}`;
  }
  if (mode === 'title') {
    return `Suggest a clearer, more specific blog/guide title (max 80 characters).
Current title: ${title || '(none)'}
Body excerpt: ${contentPlain || '(empty)'}
Rules: concrete benefit or job-to-be-done; avoid empty superlatives; return only the title text.
Locale hint: ${locale}`;
  }
  if (mode === 'outline') {
    return `Create a practical outline for this AI tools post/guide.
Title: ${title || '(none)'}
Existing body excerpt: ${contentPlain || '(empty)'}
Include: intro hook, 3–5 main sections, FAQ or tips, short conclusion.
Shape the outline to the content type (comparison / tutorial / list / explainer) when clear.
Do not invent fake product claims.`;
  }
  // improve
  return `Improve this draft for readability without changing the core meaning.
Title: ${title || '(none)'}
Draft:
${String(content || '').slice(0, 8000)}

Rules: keep useful structure; fix awkward phrasing; do not add long marketing fluff; output the full improved Markdown body only.`;
}

function normalizeAssistText(mode, raw) {
  let text = stripAssistNoise(raw);
  if (!text) return '';
  if (mode === 'description') {
    text = text.replace(/\s+/g, ' ').slice(0, 280);
    if (text.length > 180) text = `${text.slice(0, 177).replace(/\s+\S*$/, '')}…`;
  }
  if (mode === 'title') {
    text = text
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 120);
  }
  return text.trim();
}

function isAcceptable(mode, text) {
  const t = String(text || '').trim();
  if (!t) return false;
  if (mode === 'title') return t.length >= 6 && t.length <= 120;
  if (mode === 'description') return t.length >= 24 && t.length <= 280;
  if (mode === 'outline') return t.length >= 40 && /#|\n-|\n\*/.test(t);
  if (mode === 'improve') return t.length >= 20;
  return t.length >= 8;
}

/**
 * Full Kâşif assist pipeline: LLM chain then local fallback.
 * @param {{ mode: string, title?: string, description?: string, content?: string, locale?: string }} input
 * @returns {Promise<{ text: string, source: string, mode: string }>}
 */
export async function assistCreatorContent(input = {}) {
  const mode = String(input.mode || '').trim();
  if (!CREATOR_ASSIST_MODES.has(mode)) {
    throw new Error('invalid_assist_mode');
  }

  const locale = String(input.locale || 'tr').startsWith('en') ? 'en' : 'tr';
  const title = clean(input.title, 300);
  const description = clean(input.description, 800);
  const content = String(input.content || '');
  const contentPlain = plainTextFromMarkdown(content).slice(0, 6000);

  const system = systemForMode(mode, locale);
  const prompt = userPromptForMode(mode, { title, description, content, contentPlain, locale });
  const maxTokens = mode === 'improve' ? 3200 : mode === 'outline' ? 1600 : 400;

  try {
    const { text: llmText, source } = await callLlmText(prompt, {
      system,
      temperature: mode === 'improve' ? 0.4 : 0.55,
      maxTokens,
    });
    const normalized = normalizeAssistText(mode, llmText);
    if (isAcceptable(mode, normalized)) {
      return { text: normalized, source: source || 'partner', mode };
    }
  } catch {
    // fall through to local
  }

  const local = buildLocalContentAssist({ mode, title, description, content, locale });
  const normalizedLocal = normalizeAssistText(mode, local);
  if (!isAcceptable(mode, normalizedLocal)) {
    throw new Error('assist_empty');
  }
  return { text: normalizedLocal, source: 'local', mode };
}
