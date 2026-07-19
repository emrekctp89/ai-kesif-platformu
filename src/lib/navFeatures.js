/**
 * Public navigation / surface visibility.
 * Paused routes render SoftLandingPage (noindex) and stay out of main chrome
 * until they are ready to promote again. Restore full page modules from git history.
 */

/** Paths temporarily removed from public nav (header, mobile, footer). */
export const PUBLICLY_PAUSED_PATHS = new Set([
  '/kesfet',
  '/random-tools',
  '/eserler',
  '/topluluk',
  '/akis',
  '/leaderboard',
  '/launchpad',
  '/yarisma',
  '/odul-avciligi',
]);

/** Community surfaces — optional for logged-in users via profile menu toggle. */
export const COMMUNITY_PATHS = [
  '/topluluk',
  '/akis',
  '/leaderboard',
  '/eserler',
  '/launchpad',
  '/yarisma',
  '/odul-avciligi',
];

export const COMMUNITY_PANEL_STORAGE_KEY = 'ai-kesif:show-community-panel';

/**
 * @param {string} href
 * @returns {boolean}
 */
export function isPubliclyPaused(href) {
  if (!href) return false;
  const path = String(href).split('?')[0].replace(/\/$/, '') || '/';
  return PUBLICLY_PAUSED_PATHS.has(path);
}

/**
 * Filter nav link lists. Community links are kept only when allowCommunity is true.
 * @template {{ href: string }} T
 * @param {T[]} links
 * @param {{ allowCommunity?: boolean }} [options]
 * @returns {T[]}
 */
export function filterNavLinks(links, { allowCommunity = false } = {}) {
  return (links || []).filter((link) => {
    const path =
      String(link.href || '')
        .split('?')[0]
        .replace(/\/$/, '') || '/';
    if (COMMUNITY_PATHS.includes(path)) return allowCommunity;
    if (PUBLICLY_PAUSED_PATHS.has(path)) return false;
    return true;
  });
}
