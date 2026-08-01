import 'server-only';

import { callLlmText } from './partnerRunner';
import { getKasifDeepseekMode } from './deepseekMode';

export function isConversationalLlmEnabled(env = process.env, mode = {}) {
  return mode.enabled === true && Boolean(String(env.DEEPSEEK_API_KEY || '').trim());
}

function sourceContext(records, sourceIds) {
  const allowed = new Set((sourceIds || []).map(String));
  return (records || [])
    .filter((record) => allowed.has(`tool:${record.id}`))
    .slice(0, 6)
    .map((record) => ({
      id: `tool:${record.id}`,
      name: record.name,
      description: String(record.description || '').slice(0, 300),
      pricing: record.pricing_model || record.pricing_type || null,
      platforms: Array.isArray(record.platforms) ? record.platforms.slice(0, 5) : [],
      category: record.category?.name || record.category_name || null,
    }));
}

/**
 * Adds a conversational surface without letting the provider choose tools or source ids.
 * On every provider/error/validation failure the deterministic Kâşif answer is preserved.
 */
export async function enhanceKasifConversation({
  question,
  history = [],
  modelResponse,
  records = [],
  locale = 'tr',
}) {
  const mode = await getKasifDeepseekMode();
  if (
    !isConversationalLlmEnabled(process.env, mode) ||
    !modelResponse?.answer ||
    modelResponse?.meta
  ) {
    return modelResponse;
  }
  const sources = sourceContext(records, modelResponse.sourceIds);
  if (!sources.length) return modelResponse;

  const language = locale === 'en' ? 'English' : 'Turkish';
  const prompt = `Rewrite Kâşif's grounded answer as a natural, helpful chatbot response in ${language}.
Do not add, remove, or replace tools. Do not invent facts, prices, links, capabilities, or claims.
Use only the supplied source data. Keep the response under 1200 characters.
Return plain text only.

User question: ${String(question || '').slice(0, 800)}
Deterministic answer: ${String(modelResponse.answer).slice(0, 1800)}
Allowed source JSON: ${JSON.stringify(sources)}`;

  const { text, source } = await callLlmText(prompt, {
    system:
      'You are Kâşif v2.1, a catalog-grounded system CEO. Never mention or recommend a tool outside the allowed source JSON.',
    history,
    temperature: 0.35,
    maxTokens: 700,
  });
  const answer = String(text || '').trim();
  if (answer.length < 20) return modelResponse;
  return {
    ...modelResponse,
    answer: answer.slice(0, 2000),
    conversational: true,
    conversationalSource: source,
  };
}
