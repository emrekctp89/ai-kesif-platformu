/**
 * Kâşif JSON assistants for admin/user product features that previously
 * called Gemini directly: challenge ideas, Co-Pilot, project strategist.
 *
 * Chain: Partner → Gemini (callLlmJson) → deterministic local JSON.
 */

import { callLlmJson } from './partnerRunner';

function clean(value, max = 800) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function titleCaseTopic(topic) {
  const t = clean(topic, 80);
  if (!t) return 'AI';
  return t.charAt(0).toLocaleUpperCase('tr-TR') + t.slice(1);
}

/** @param {string} topic */
export function buildLocalChallengeIdea(topic) {
  const t = titleCaseTopic(topic);
  return {
    title: `${t} Challenge`,
    description: `${t} temalı bir topluluk yarışması: 7 günde tek bir teslim üret, en yaratıcı ve uygulanabilir çıktılar öne çıksın. Katılımcılar prompt, görsel veya kısa demo paylaşabilir.`,
  };
}

/**
 * @param {string} topic
 * @returns {Promise<{ data: { title: string, description: string }, source: string }>}
 */
export async function generateChallengeIdeaWithKasif(topic) {
  const safeTopic = clean(topic, 200);
  if (safeTopic.length < 2) throw new Error('empty_topic');

  const prompt = `You are Kâşif, creativity assistant for an AI tools community.
Topic: "${safeTopic}"
Return ONLY valid JSON:
{
  "title": "catchy challenge title max 80 chars",
  "description": "inspiring short description max 280 chars in Turkish"
}
Rules: encourage participation; no fake prizes; practical deliverable.`;

  try {
    const { data, source } = await callLlmJson(prompt);
    const title = clean(data?.title, 120);
    const description = clean(data?.description, 400);
    if (title.length >= 4 && description.length >= 20) {
      return { data: { title, description }, source: source || 'partner' };
    }
  } catch {
    // local
  }

  return { data: buildLocalChallengeIdea(safeTopic), source: 'local' };
}

/**
 * @param {{ userPrompt?: string, totals?: { total_users?: number, total_tools?: number } }} input
 */
export function buildLocalCoPilotResponse(input = {}) {
  const q = clean(input.userPrompt, 200) || 'platform';
  const users = Number(input.totals?.total_users) || 0;
  const tools = Number(input.totals?.total_tools) || 0;
  return {
    response_title: 'Kâşif yerel co-pilot notu',
    response_text: `Bulut model yokken yerel özet: anlık envanter ~${users} kullanıcı, ~${tools} araç. Sorun: “${q}”. Öneri: (1) Kâşif funnel/admin kalite metriklerine bak, (2) ilgili server action veya /api/kasif uçlarını kontrol et, (3) değişiklikleri offline jest ile doğrula. Tam kod için partner/Gemini zincirini aç.`,
    code_suggestion: null,
  };
}

/**
 * @param {{ userPrompt: string, history?: Array<{role:string,content:any}>, platformContext: string, totals?: object }} input
 */
export async function generateCoPilotWithKasif(input = {}) {
  const userPrompt = clean(input.userPrompt, 1500);
  if (userPrompt.length < 2) throw new Error('empty_prompt');

  const historyText = (Array.isArray(input.history) ? input.history : [])
    .slice(-6)
    .map((m) => {
      const role = m?.role === 'user' ? 'admin' : 'assistant';
      const content =
        typeof m?.content === 'string' ? m.content : JSON.stringify(m?.content || '');
      return `${role}: ${clean(content, 600)}`;
    })
    .join('\n');

  const prompt = `You are Kâşif Co-Pilot for AI Keşif Platform (Next.js App Router, Supabase, Tailwind, shadcn, Server Actions).
${clean(input.platformContext, 1500)}

Recent chat:
${historyText || '(none)'}

Admin question: "${userPrompt}"

Return ONLY valid JSON:
{
  "response_title": "short title",
  "response_text": "actionable analysis in Turkish",
  "code_suggestion": null or { "language": "javascript|sql|jsx", "code": "full code", "explanation": "short" }
}
Rules: practical; match stack; if no code needed set code_suggestion null.`;

  try {
    const { data, source } = await callLlmJson(prompt);
    const response_title = clean(data?.response_title, 120);
    const response_text = clean(data?.response_text, 4000);
    if (response_title.length >= 3 && response_text.length >= 20) {
      let code_suggestion = null;
      if (data?.code_suggestion && typeof data.code_suggestion === 'object') {
        const code = String(data.code_suggestion.code || '').trim();
        if (code) {
          code_suggestion = {
            language: clean(data.code_suggestion.language, 40) || 'javascript',
            code: code.slice(0, 12000),
            explanation: clean(data.code_suggestion.explanation, 800) || '',
          };
        }
      }
      return {
        data: { response_title, response_text, code_suggestion },
        source: source || 'partner',
      };
    }
  } catch {
    // local
  }

  return {
    data: buildLocalCoPilotResponse({ userPrompt, totals: input.totals }),
    source: 'local',
  };
}

/**
 * @param {{ title?: string, description?: string, toolNames?: string[] }} project
 */
export function buildLocalProjectStrategy(project = {}) {
  const title = clean(project.title, 120) || 'Proje';
  const tools = Array.isArray(project.toolNames) ? project.toolNames.filter(Boolean).slice(0, 6) : [];
  const toolLine = tools.length ? tools.join(', ') : 'henüz araç eklenmemiş';
  return {
    project_summary: `“${title}” için envanter: ${toolLine}. Odak: net bir ilk teslim + tekrarlanabilir iş akışı.`,
    strategic_suggestions: [
      'Tek cümlelik başarı tanımı yaz (bu hafta bitecek somut çıktı).',
      'Her araç için “girdi → ayar → çıktı” mini şablon tut; tekrar işleri standartlaştır.',
      'Kâşif / Workmind ile 3–5 adımlık akış çıkar; adım başına tek birincil araç seç.',
    ],
    potential_tools: ['Görsel / kapak üretimi', 'SEO / meta kontrolü'],
  };
}

/**
 * @param {{ formattedData: string, title?: string, toolNames?: string[] }} input
 */
export async function generateProjectStrategyWithKasif(input = {}) {
  const formattedData = String(input.formattedData || '').slice(0, 6000);
  const prompt = `You are Kâşif project strategist for an AI tools platform.
PROJECT DATA:
${formattedData}

Return ONLY valid JSON:
{
  "project_summary": "2 sentences in Turkish",
  "strategic_suggestions": ["3 concrete creative suggestions in Turkish"],
  "potential_tools": ["2 tool *types* not already listed, Turkish"]
}`;

  try {
    const { data, source } = await callLlmJson(prompt);
    const project_summary = clean(data?.project_summary, 500);
    const strategic_suggestions = Array.isArray(data?.strategic_suggestions)
      ? data.strategic_suggestions.map((s) => clean(s, 300)).filter((s) => s.length >= 8).slice(0, 5)
      : [];
    const potential_tools = Array.isArray(data?.potential_tools)
      ? data.potential_tools.map((s) => clean(s, 120)).filter(Boolean).slice(0, 4)
      : [];
    if (project_summary.length >= 20 && strategic_suggestions.length >= 2) {
      return {
        data: {
          project_summary,
          strategic_suggestions,
          potential_tools:
            potential_tools.length >= 1
              ? potential_tools
              : buildLocalProjectStrategy(input).potential_tools,
        },
        source: source || 'partner',
      };
    }
  } catch {
    // local
  }

  return {
    data: buildLocalProjectStrategy({
      title: input.title,
      toolNames: input.toolNames,
    }),
    source: 'local',
  };
}
