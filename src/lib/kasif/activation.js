/**
 * System-level Kâşif activation:
 * - default ON unless explicitly disabled with KASIF_ENABLED=false
 * - LOCAL_KASIF_ENABLED=true can override and force-enable local/test flows
 */
export function isKasifEnabled(env = {}) {
  const globalEnabled = env.KASIF_ENABLED !== 'false';
  const localOverride = env.LOCAL_KASIF_ENABLED === 'true';
  return globalEnabled || localOverride;
}

/**
 * Site-surface activation (widget + experiment routes):
 * - requires explicit opt-in via KASIF_ENABLED=true or LOCAL_KASIF_ENABLED=true
 */
export function isKasifSiteEnabled(env = {}) {
  return env.KASIF_ENABLED === 'true' || env.LOCAL_KASIF_ENABLED === 'true';
}
