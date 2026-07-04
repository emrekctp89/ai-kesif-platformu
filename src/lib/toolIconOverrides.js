const DEFAULT_TOOL_ICON_OVERRIDES = {
  'chat.openai.com': 'https://chat.openai.com/favicon.ico',
  'openai.com': 'https://openai.com/favicon.ico',
  'claude.ai': 'https://claude.ai/favicon.ico',
  'anthropic.com': 'https://www.anthropic.com/favicon.ico',
  'gemini.google.com': 'https://gemini.google.com/favicon.ico',
  'deepseek.com': 'https://www.deepseek.com/favicon.ico',
  'x.ai': 'https://x.ai/favicon.ico',
  'perplexity.ai': 'https://www.perplexity.ai/favicon.ico',
};

function sanitizeOverrideMap(rawMap) {
  const sanitized = {};
  for (const [host, iconUrl] of Object.entries(rawMap || {})) {
    const normalizedHost = String(host || '')
      .trim()
      .toLowerCase();
    const normalizedIconUrl = String(iconUrl || '').trim();
    if (!normalizedHost || !normalizedIconUrl) continue;
    if (!/^https?:\/\//i.test(normalizedIconUrl)) continue;
    sanitized[normalizedHost] = normalizedIconUrl;
  }
  return sanitized;
}

function loadToolIconOverrides() {
  const envRaw = process.env.TOOL_ICON_OVERRIDES;
  if (!envRaw) return DEFAULT_TOOL_ICON_OVERRIDES;

  try {
    const parsed = JSON.parse(envRaw);
    return {
      ...DEFAULT_TOOL_ICON_OVERRIDES,
      ...sanitizeOverrideMap(parsed),
    };
  } catch {
    return DEFAULT_TOOL_ICON_OVERRIDES;
  }
}

export const TOOL_ICON_OVERRIDES = loadToolIconOverrides();
