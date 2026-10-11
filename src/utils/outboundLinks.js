const DEFAULT_UTM = {
  source: 'aikesif',
  medium: 'referral',
  campaign: 'tool_directory',
};

export function buildTrackedOutboundUrl(href, { content } = {}) {
  if (typeof href !== 'string' || !href.trim()) return href;

  try {
    const url = new URL(href);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return href;

    url.searchParams.set('utm_source', DEFAULT_UTM.source);
    url.searchParams.set('utm_medium', DEFAULT_UTM.medium);
    url.searchParams.set('utm_campaign', DEFAULT_UTM.campaign);

    if (content) {
      url.searchParams.set('utm_content', content);
    }

    return url.toString();
  } catch {
    return href;
  }
}

export function preserveReferrerRel(rel = '') {
  const tokens = String(rel)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.toLowerCase() !== 'noreferrer');

  if (!tokens.some((token) => token.toLowerCase() === 'noopener')) {
    tokens.push('noopener');
  }

  return [...new Set(tokens)].join(' ');
}
