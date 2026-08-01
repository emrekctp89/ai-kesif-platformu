export const KASIF_VERSION = '2.1.0';
export const KASIF_RELEASE_NAME = 'Evidence CEO';
export const KASIF_RELEASED_AT = '2026-08-01';

export const KASIF_CAPABILITIES = Object.freeze([
  { id: 'understand', tier: 'core', label: 'TR/EN goal and intent understanding' },
  { id: 'recommend', tier: 'core', label: 'Catalog-grounded tool recommendations' },
  { id: 'plan', tier: 'core', label: 'Multi-step Workmind execution plans' },
  { id: 'produce', tier: 'core', label: 'Job packs, wizards and first deliverables' },
  { id: 'compare', tier: 'core', label: 'Free/paid tool comparison' },
  { id: 'scrape', tier: 'core', label: 'Evidence-scored web scraping' },
  { id: 'queue', tier: 'core', label: 'Approval-gated catalog discovery' },
  { id: 'track', tier: 'core', label: 'Job session, funnel and completion tracking' },
  { id: 'learn', tier: 'core', label: 'Reviewed taxonomy and lexicon learning' },
  { id: 'proactive', tier: 'core', label: 'Rate-limited proactive recommendations' },
  { id: 'enrich', tier: 'optional', label: 'External model enrichment' },
  { id: 'partner', tier: 'optional', label: 'Partner runner handoff' },
]);

function configured(value) {
  return Boolean(String(value || '').trim());
}

export function buildKasifRuntimeStatus(env = {}) {
  const enabled = env.KASIF_ENABLED !== 'false';
  const scrapingEnabled = env.KASIF_SCRAPE_ENABLED !== 'false';
  const providers = {
    gemini: configured(env.GEMINI_API_KEY),
    embeddings: configured(env.GEMINI_API_KEY),
    partner: configured(env.KASIF_PARTNER_API_URL) && configured(env.KASIF_PARTNER_API_KEY),
  };
  const externalConfigured = Object.values(providers).some(Boolean);

  return {
    product: 'kasif',
    version: KASIF_VERSION,
    releaseName: KASIF_RELEASE_NAME,
    releasedAt: KASIF_RELEASED_AT,
    enabled,
    mode: externalConfigured ? 'local-first-hybrid' : 'local-only',
    readiness: enabled ? 'ready' : 'disabled',
    capabilities: KASIF_CAPABILITIES.map((capability) => ({
      ...capability,
      status:
        capability.id === 'scrape' || capability.id === 'queue'
          ? scrapingEnabled
            ? 'ready'
            : 'disabled'
          : capability.tier === 'core'
            ? 'ready'
            : capability.id === 'partner'
              ? providers.partner
                ? 'configured'
                : 'optional'
              : providers.gemini
                ? 'configured'
                : 'optional',
    })),
    providers,
    guarantees: {
      catalogGrounded: true,
      scrapingApprovalRequired: true,
      automaticPublishing: false,
      paidProviderRequired: false,
      secretValuesExposed: false,
    },
  };
}
