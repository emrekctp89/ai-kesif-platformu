/**
 * Partner API runner — OpenAI-compatible chat completions for pack generation.
 *
 * Explicit env (preferred):
 *   KASIF_PARTNER_API_URL  — base URL including /v1 (e.g. https://api.openai.com/v1)
 *   KASIF_PARTNER_API_KEY  — bearer token
 *   KASIF_PARTNER_MODEL    — optional, default gpt-4o-mini
 *   KASIF_PARTNER_TIMEOUT_MS — optional, default 20000
 *
 * Convenience fallbacks (when URL/KEY not both set):
 *   OPENAI_API_KEY  → https://api.openai.com/v1  (+ OPENAI_MODEL / gpt-4o-mini)
 *   XAI_API_KEY     → https://api.x.ai/v1         (+ XAI_MODEL / grok-2-latest)
 */

function isPlaceholderSecret(value) {
  const v = String(value || '').trim();
  if (!v) return true;
  return /^(your_|change.?me|xxx|placeholder|example|replace)/i.test(v);
}

/**
 * Resolve OpenAI-compatible partner endpoint from env.
 * @returns {{ baseUrl: string, apiKey: string, model: string, timeoutMs: number, via: string }|null}
 */
export function resolvePartnerRunnerConfig(env = process.env) {
  const timeoutMs = Math.min(Math.max(Number(env.KASIF_PARTNER_TIMEOUT_MS) || 20000, 3000), 60000);

  const explicitUrl = String(env.KASIF_PARTNER_API_URL || '')
    .trim()
    .replace(/\/$/, '');
  const explicitKey = String(env.KASIF_PARTNER_API_KEY || '').trim();
  if (explicitUrl && explicitKey && !isPlaceholderSecret(explicitKey)) {
    return {
      baseUrl: explicitUrl,
      apiKey: explicitKey,
      model: String(env.KASIF_PARTNER_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini',
      timeoutMs,
      via: 'kasif_partner',
    };
  }

  // Allow partial explicit: KEY only + default OpenAI URL, or URL only + OPENAI/XAI key.
  const openaiKey = String(env.OPENAI_API_KEY || '').trim();
  if (openaiKey && !isPlaceholderSecret(openaiKey)) {
    return {
      baseUrl: explicitUrl || 'https://api.openai.com/v1',
      apiKey: explicitKey && !isPlaceholderSecret(explicitKey) ? explicitKey : openaiKey,
      model:
        String(env.KASIF_PARTNER_MODEL || env.OPENAI_MODEL || 'gpt-4o-mini').trim() ||
        'gpt-4o-mini',
      timeoutMs,
      via: explicitUrl || explicitKey ? 'kasif_partner+openai' : 'openai',
    };
  }

  const xaiKey = String(env.XAI_API_KEY || '').trim();
  if (xaiKey && !isPlaceholderSecret(xaiKey)) {
    return {
      baseUrl: explicitUrl || 'https://api.x.ai/v1',
      apiKey: explicitKey && !isPlaceholderSecret(explicitKey) ? explicitKey : xaiKey,
      model:
        String(env.KASIF_PARTNER_MODEL || env.XAI_MODEL || 'grok-2-latest').trim() ||
        'grok-2-latest',
      timeoutMs,
      via: explicitUrl || explicitKey ? 'kasif_partner+xai' : 'xai',
    };
  }

  return null;
}

export function isPartnerRunnerConfigured(env = process.env) {
  return Boolean(resolvePartnerRunnerConfig(env));
}

export function getPartnerRunnerConfig(env = process.env) {
  const config = resolvePartnerRunnerConfig(env);
  if (!config) return null;
  return {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    timeoutMs: config.timeoutMs,
    via: config.via,
  };
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || raw;
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first === -1 || last <= first) throw new Error('no_json');
  return JSON.parse(candidate.slice(first, last + 1));
}

/**
 * Call partner chat completions and parse JSON object from the assistant message.
 * @param {string} userPrompt
 * @param {{ system?: string }} [options]
 * @returns {Promise<object|null>}
 */
export async function callPartnerChatJson(userPrompt, options = {}) {
  const config = getPartnerRunnerConfig();
  if (!config) return null;

  const endpoint = `${config.baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.5,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              options.system ||
              'You are a pack runner for an AI tools platform. Respond with valid JSON only.',
          },
          { role: 'user', content: String(userPrompt || '').slice(0, 6000) },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    if (!text) return null;
    return extractJsonObject(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Provider chain for pack JSON generation: partner → Gemini → null.
 * Returns { data, source } where source is partner|gemini|null.
 */
export async function callLlmJson(prompt, options = {}) {
  const partner = await callPartnerChatJson(prompt, options);
  if (partner && typeof partner === 'object') {
    return { data: partner, source: 'partner' };
  }

  const gemini = await callGeminiJson(prompt);
  if (gemini && typeof gemini === 'object') {
    return { data: gemini, source: 'gemini' };
  }

  return { data: null, source: null };
}

/**
 * Free-text partner chat (no JSON response_format).
 * Used by Kâşif content assist and other non-pack writers.
 * @param {string} userPrompt
 * @param {{ system?: string, temperature?: number, maxTokens?: number }} [options]
 * @returns {Promise<string|null>}
 */
export async function callPartnerChatText(userPrompt, options = {}) {
  const config = getPartnerRunnerConfig();
  if (!config) return null;

  const endpoint = `${config.baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: Number.isFinite(options.temperature) ? options.temperature : 0.55,
        max_tokens: Math.min(Math.max(Number(options.maxTokens) || 2048, 128), 4096),
        messages: [
          {
            role: 'system',
            content:
              options.system ||
              'You are Kâşif, the writing assistant for the AI Keşif tools platform. Return only the requested text.',
          },
          { role: 'user', content: String(userPrompt || '').slice(0, 10000) },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = String(data?.choices?.[0]?.message?.content || '').trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Free-text provider chain: partner → Gemini → null.
 * Returns { text, source } where source is partner|gemini|null.
 * @param {string} prompt
 * @param {{ system?: string, temperature?: number, maxTokens?: number }} [options]
 */
export async function callLlmText(prompt, options = {}) {
  const partner = await callPartnerChatText(prompt, options);
  if (partner) {
    return { text: partner, source: 'partner' };
  }

  const gemini = await callGeminiText(prompt, options);
  if (gemini) {
    return { text: gemini, source: 'gemini' };
  }

  return { text: null, source: null };
}

async function callGeminiJson(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model =
    String(process.env.GEMINI_TEXT_MODEL || 'gemini-flash-latest').trim() || 'gemini-flash-latest';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('') || '';
    if (!text) return null;
    return extractJsonObject(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callGeminiText(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model =
    String(process.env.GEMINI_TEXT_MODEL || 'gemini-flash-latest').trim() || 'gemini-flash-latest';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  const system = String(options.system || '').trim();
  const maxTokens = Math.min(Math.max(Number(options.maxTokens) || 2048, 128), 4096);
  const temperature = Number.isFinite(options.temperature) ? options.temperature : 0.55;

  try {
    const body = {
      contents: [{ role: 'user', parts: [{ text: String(prompt || '') }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('') || '';
    return String(text || '').trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Non-secret runner provider status for UI / ops.
 * preferredSource: which LLM tier will be tried first for pack JSON.
 * chain: ordered fallbacks after preferred (always ends with local).
 */
export function partnerRunnerStatus(env = process.env) {
  const config = getPartnerRunnerConfig(env);
  const configured = Boolean(config);
  const hasGeminiFallback = Boolean(String(env.GEMINI_API_KEY || '').trim());
  const preferredSource = configured ? 'partner' : hasGeminiFallback ? 'gemini' : 'local';
  const chain = [];
  if (configured) chain.push('partner');
  if (hasGeminiFallback) chain.push('gemini');
  chain.push('local');

  return {
    configured,
    model: config?.model || null,
    // never expose the key
    baseUrlHost: config?.baseUrl
      ? (() => {
          try {
            return new URL(config.baseUrl).host;
          } catch {
            return null;
          }
        })()
      : null,
    /** How credentials were resolved: kasif_partner | openai | xai | … */
    via: config?.via || null,
    hasGeminiFallback,
    preferredSource,
    chain,
    qualityMode: preferredSource === 'local' ? 'local' : 'cloud',
  };
}

/** Friendly source label for UI (tr/en). */
export function formatRunnerSourceLabel(source, locale = 'tr') {
  const key = String(source || 'local')
    .toLowerCase()
    .replace(/-fallback$/, '');
  const en = {
    partner: 'Kasif (partner)',
    gemini: 'Kasif (Gemini)',
    local: 'Kasif local draft',
    provider: 'Kasif cloud',
  };
  const tr = {
    partner: 'Kâşif (partner)',
    gemini: 'Kâşif (Gemini)',
    local: 'Kâşif yerel taslak',
    provider: 'Kâşif bulut',
  };
  const pack = locale === 'en' ? en : tr;
  return pack[key] || pack.local;
}
