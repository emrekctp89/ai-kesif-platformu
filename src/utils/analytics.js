/**
 * Lightweight analytics helpers (safe on server — no-ops without `window`).
 * Prefer named helpers for consistent GA4 / GTM event names.
 */

export const AnalyticsEvents = {
  TOOL_SEARCH: 'tool_search',
  TOOL_VIEW: 'tool_view',
  TOOL_CTA: 'official_site_click',
  TOOL_SHARE: 'tool_share',
  TOOL_FAVORITE: 'tool_favorite',
  COMPARISON_VIEW: 'comparison_view',
  COMPARISON_START: 'comparison_start',
  SUBMIT_START: 'submit_start',
  SUBMIT_SUCCESS: 'submit_success',
  CTA_CLICK: 'cta_click',
  SIGNUP_START: 'signup_start',
  PRO_UPGRADE_CLICK: 'pro_upgrade_click',
};

function cleanParameters(parameters = {}) {
  return Object.fromEntries(
    Object.entries(parameters).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        ['string', 'number', 'boolean'].includes(typeof value)
    )
  );
}

/**
 * Push a custom event to gtag / GTM dataLayer.
 */
export function trackEvent(name, parameters = {}) {
  if (typeof window === 'undefined' || !name) return;

  const cleanedParameters = cleanParameters(parameters);

  if (typeof window.gtag === 'function') {
    window.gtag('event', name, cleanedParameters);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...cleanedParameters });
}

export function trackSearch(query, extra = {}) {
  const normalized = String(query || '').trim();
  if (!normalized) return;
  trackEvent(AnalyticsEvents.TOOL_SEARCH, {
    query_length: normalized.length,
    has_query: true,
    ...extra,
  });
}

export function trackToolView({ toolSlug, toolName, category, ...extra } = {}) {
  trackEvent(AnalyticsEvents.TOOL_VIEW, {
    tool_slug: toolSlug,
    tool_name: toolName,
    category,
    ...extra,
  });
}

export function trackComparisonView({ toolCount = 0, toolSlugs = '', ...extra } = {}) {
  trackEvent(AnalyticsEvents.COMPARISON_VIEW, {
    tool_count: toolCount,
    tool_slugs: toolSlugs,
    ...extra,
  });
}

export function trackCtaClick({ cta, location, ...extra } = {}) {
  trackEvent(AnalyticsEvents.CTA_CLICK, {
    cta_name: cta,
    cta_location: location,
    ...extra,
  });
}

export function trackShare({ method, contentType, itemId, ...extra } = {}) {
  trackEvent(AnalyticsEvents.TOOL_SHARE, {
    method,
    content_type: contentType,
    item_id: itemId,
    ...extra,
  });
}
