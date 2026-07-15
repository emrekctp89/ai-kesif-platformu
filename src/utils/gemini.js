import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-flash-latest';
const DEFAULT_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

function requireApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY bulunamadı.');
  }
  return apiKey;
}

/**
 * Shared Gemini client (@google/generative-ai).
 */
export function getGenerativeAI() {
  return new GoogleGenerativeAI(requireApiKey());
}

/**
 * Text generation helper.
 * @param {string} prompt
 * @param {{ model?: string, systemInstruction?: string }} [options]
 * @returns {Promise<string>}
 */
export async function generateGeminiText(prompt, options = {}) {
  const modelName = options.model || DEFAULT_TEXT_MODEL;
  const genAI = getGenerativeAI();
  const model = genAI.getGenerativeModel({
    model: modelName,
    ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : null),
  });

  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.();
  if (!text) {
    throw new Error('Gemini boş yanıt döndürdü.');
  }
  return text;
}

/**
 * Embedding helper (text-embedding-004).
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedGeminiText(text) {
  const genAI = getGenerativeAI();
  const model = genAI.getGenerativeModel({ model: DEFAULT_EMBED_MODEL });
  const result = await model.embedContent(text);
  const values = result?.embedding?.values;
  if (!values?.length) {
    throw new Error("API'den geçerli bir embedding vektörü alınamadı.");
  }
  return values;
}
