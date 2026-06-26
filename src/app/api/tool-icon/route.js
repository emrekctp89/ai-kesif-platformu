const ICON_LINK_REGEX =
  /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi;

function isPrivateIpv4(hostname) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function isDisallowedHost(hostname) {
  const normalized = String(hostname || "").toLowerCase();
  if (!normalized) return true;
  if (normalized === "localhost") return true;
  if (normalized.endsWith(".local")) return true;
  if (isPrivateIpv4(normalized)) return true;
  return false;
}

function normalizeLink(link) {
  if (!link) return null;
  const raw = String(link).trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (isDisallowedHost(parsed.hostname)) return null;
    return parsed;
  } catch {
    try {
      const parsed = new URL(`https://${raw}`);
      if (isDisallowedHost(parsed.hostname)) return null;
      return parsed;
    } catch {
      return null;
    }
  }
}

function makeCandidates(url) {
  const host = url.hostname;
  const origin = url.origin;

  const candidates = [
    `${origin}/favicon.ico`,
    `${origin}/favicon.png`,
    `${origin}/apple-touch-icon.png`,
    `${origin}/favicon-32x32.png`,
    `${origin}/favicon-16x16.png`,
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
    `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
  ];

  return [...new Set(candidates)];
}

function extractIconLinksFromHtml(html, baseUrl) {
  const results = [];
  for (const match of html.matchAll(ICON_LINK_REGEX)) {
    const href = match[1];
    if (!href) continue;
    try {
      const absolute = new URL(href, baseUrl);
      if (!["http:", "https:"].includes(absolute.protocol)) continue;
      if (isDisallowedHost(absolute.hostname)) continue;
      results.push(absolute.toString());
    } catch {}
  }
  return results;
}

async function fetchAsImage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; AIKesifIconBot/1.0)",
      },
      redirect: "follow",
      cache: "force-cache",
      next: { revalidate: 86400 },
    });

    if (!response.ok) return null;
    const type = response.headers.get("content-type") || "";
    if (!type.toLowerCase().includes("image")) return null;

    const body = await response.arrayBuffer();
    if (!body || body.byteLength < 16) return null;

    return new Response(body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawLink = searchParams.get("link");
  const normalizedUrl = normalizeLink(rawLink);

  if (!normalizedUrl) {
    return new Response("Invalid link", { status: 400 });
  }

  const directCandidates = makeCandidates(normalizedUrl);
  for (const candidate of directCandidates) {
    const imageResponse = await fetchAsImage(candidate);
    if (imageResponse) return imageResponse;
  }

  try {
    const htmlResponse = await fetch(normalizedUrl.toString(), {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; AIKesifIconBot/1.0)",
      },
      redirect: "follow",
      cache: "force-cache",
      next: { revalidate: 86400 },
    });

    if (htmlResponse.ok) {
      const html = await htmlResponse.text();
      const htmlCandidates = extractIconLinksFromHtml(html, normalizedUrl);
      for (const candidate of htmlCandidates) {
        const imageResponse = await fetchAsImage(candidate);
        if (imageResponse) return imageResponse;
      }
    }
  } catch {}

  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
