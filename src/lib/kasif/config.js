import 'server-only';

export function isKasifEnabled(env = process.env) {
  const globalEnabled = env.KASIF_ENABLED !== 'false';
  const localOverride = env.LOCAL_KASIF_ENABLED === 'true';
  return globalEnabled || localOverride;
}

export const kasifConfig = {
  enabled: isKasifEnabled(process.env),
};

export function assertKasifEnabled() {
  if (!kasifConfig.enabled) {
    throw new Error('KASIF_DISABLED');
  }
}
