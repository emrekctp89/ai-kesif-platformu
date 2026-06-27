const BLOCKED_TOOL_HOSTS = ["topai.tools"];

function parseHostname(link) {
  const raw = String(link || "").trim();
  if (!raw) return null;

  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    try {
      return new URL(`https://${raw}`).hostname.toLowerCase();
    } catch {
      return null;
    }
  }
}

export function getBlockedToolHost(link) {
  const hostname = parseHostname(link);
  if (!hostname) return null;

  for (const blockedHost of BLOCKED_TOOL_HOSTS) {
    if (hostname === blockedHost || hostname.endsWith(`.${blockedHost}`)) {
      return blockedHost;
    }
  }

  return null;
}
