export function isKasifEnabled(env = {}) {
  const globalEnabled = env.KASIF_ENABLED !== 'false';
  const localOverride = env.LOCAL_KASIF_ENABLED === 'true';
  return globalEnabled || localOverride;
}

export function isKasifSiteEnabled(env = {}) {
  return env.KASIF_ENABLED === 'true' || env.LOCAL_KASIF_ENABLED === 'true';
}
