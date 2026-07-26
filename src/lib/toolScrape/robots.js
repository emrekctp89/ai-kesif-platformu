const ROBOTS_CACHE_TTL_MS = 30 * 60 * 1000;
const ROBOTS_MAX_BYTES = 256 * 1024;
const ROBOT_NAME = 'AIKesifToolScrape';
const robotsCache = new Map();

function matchingRuleLength(path, rulePath) {
  if (!rulePath) return -1;
  const escaped = rulePath
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\\\$$/, '$');
  const expression = new RegExp(`^${escaped}`);
  return expression.test(path) ? rulePath.replace(/\*|\$$/g, '').length : -1;
}

export function parseRobotsPermission(text, targetUrl, robotName = ROBOT_NAME) {
  const groups = [];
  let current = null;

  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === 'user-agent') {
      if (!current || current.hasRules) {
        current = { agents: [], rules: [], hasRules: false };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && current) {
      current.hasRules = true;
      if (value) current.rules.push({ type: key, path: value });
    }
  }

  const name = String(robotName || '').toLowerCase();
  const specific = groups.filter((group) => group.agents.some((agent) => name.includes(agent)));
  const applicable =
    specific.length > 0
      ? specific
      : groups.filter((group) => group.agents.some((agent) => agent === '*'));
  const path = `${targetUrl.pathname || '/'}${targetUrl.search || ''}`;
  let winner = null;
  for (const group of applicable) {
    for (const rule of group.rules) {
      const length = matchingRuleLength(path, rule.path);
      if (
        length >= 0 &&
        (!winner || length > winner.length || (length === winner.length && rule.type === 'allow'))
      ) {
        winner = { ...rule, length };
      }
    }
  }
  return {
    allowed: winner?.type !== 'disallow',
    matchedRule: winner ? `${winner.type}:${winner.path}` : null,
  };
}

async function readRobotsText(response) {
  const declared = Number.parseInt(response.headers.get('content-length') || '', 10);
  if (Number.isFinite(declared) && declared > ROBOTS_MAX_BYTES) return '';
  const text = await response.text();
  return Buffer.byteLength(text, 'utf8') <= ROBOTS_MAX_BYTES ? text : '';
}

export async function checkRobotsPermission(rawUrl, options = {}) {
  const targetUrl = new URL(rawUrl);
  const cacheKey = targetUrl.origin;
  const now = Date.now();
  const cached = robotsCache.get(cacheKey);
  let robotsText = cached?.expiresAt > now ? cached.text : null;

  if (robotsText === null) {
    try {
      const response = await fetch(`${targetUrl.origin}/robots.txt`, {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(options.timeoutMs || 3000),
        headers: {
          'user-agent': `${ROBOT_NAME}/1.0 (+https://aikesif.com)`,
          accept: 'text/plain,*/*;q=0.1',
        },
      });
      robotsText = response.ok ? await readRobotsText(response) : '';
    } catch {
      robotsText = '';
    }
    robotsCache.set(cacheKey, { text: robotsText, expiresAt: now + ROBOTS_CACHE_TTL_MS });
  }

  return parseRobotsPermission(robotsText, targetUrl);
}

export function clearRobotsCache() {
  robotsCache.clear();
}

export { ROBOT_NAME, ROBOTS_CACHE_TTL_MS };
