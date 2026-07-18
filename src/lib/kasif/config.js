import 'server-only';

export const kasifConfig = {
  enabled: process.env.LOCAL_KASIF_ENABLED === 'true',
  baseUrl: (process.env.LOCAL_KASIF_URL || 'http://127.0.0.1:11434').replace(/\/$/, ''),
  model: process.env.LOCAL_KASIF_MODEL || 'qwen2.5:7b',
  timeoutMs: Number.parseInt(process.env.LOCAL_KASIF_TIMEOUT_MS || '45000', 10),
};

export function assertKasifEnabled() {
  if (!kasifConfig.enabled) {
    throw new Error('KASIF_DISABLED');
  }
}
