import { TOOL_ICON_OVERRIDES } from "@/lib/toolIconOverrides";

const ICON_LINK_REGEX =
  /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
const MANIFEST_LINK_REGEX =
  /<link[^>]+rel=["'][^"']*manifest[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
const META_IMAGE_REGEX =
  /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
const COMMON_SECOND_LEVEL_LABELS = new Set([
  "ac",
  "co",
  "com",
  "edu",
  "gov",
  "net",
  "org",
]);

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

function getRegistrableDomain(hostname) {
  const parts = String(hostname || "")
    .toLowerCase()
    .split(".")
    .filter(Boolean);
  if (parts.length <= 2) return parts.join(".");

  const secondLevel = parts[parts.length - 2];
  if (COMMON_SECOND_LEVEL_LABELS.has(secondLevel) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
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
  const rootHost = getRegistrableDomain(host);
  const overrideIconUrl = TOOL_ICON_OVERRIDES[host] || TOOL_ICON_OVERRIDES[rootHost] || null;
  const providerHosts = [...new Set([host, rootHost].filter(Boolean))];
  const providerCandidates = providerHosts.flatMap((providerHost) => [
    { url: `https://logo.clearbit.com/${providerHost}`, source: "clearbit-logo" },
    { url: `https://icon.horse/icon/${providerHost}`, source: "icon-horse" },
    { url: `https://icons.duckduckgo.com/ip3/${providerHost}.ico`, source: "duckduckgo" },
    {
      url: `https://www.google.com/s2/favicons?domain=${providerHost}&sz=64`,
      source: "google-s2-domain",
    },
    {
      url: `https://www.google.com/s2/favicons?domain_url=https://${providerHost}&sz=64`,
      source: "google-s2-domain-url",
    },
  ]);

  const candidates = [
    ...(overrideIconUrl
      ? [{ url: overrideIconUrl, source: "manual-override" }]
      : []),
    { url: `${origin}/favicon.ico`, source: "site-favicon-ico" },
    { url: `${origin}/favicon.png`, source: "site-favicon-png" },
    { url: `${origin}/apple-touch-icon.png`, source: "site-apple-touch-icon" },
    { url: `${origin}/favicon-32x32.png`, source: "site-favicon-32" },
    { url: `${origin}/favicon-16x16.png`, source: "site-favicon-16" },
    ...providerCandidates,
  ];

  const deduped = new Map();
  for (const candidate of candidates) {
    if (!deduped.has(candidate.url)) {
      deduped.set(candidate.url, candidate);
    }
  }
  return [...deduped.values()];
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
      results.push({
        url: absolute.toString(),
        source: "html-link-icon",
      });
    } catch {}
  }
  return results;
}

function extractMetaImageLinksFromHtml(html, baseUrl) {
  const results = [];
  for (const match of html.matchAll(META_IMAGE_REGEX)) {
    const href = match[1];
    if (!href) continue;
    try {
      const absolute = new URL(href, baseUrl);
      if (!["http:", "https:"].includes(absolute.protocol)) continue;
      if (isDisallowedHost(absolute.hostname)) continue;
      results.push({
        url: absolute.toString(),
        source: "html-meta-image",
      });
    } catch {}
  }
  return results;
}

function extractManifestLinksFromHtml(html, baseUrl) {
  const results = [];
  for (const match of html.matchAll(MANIFEST_LINK_REGEX)) {
    const href = match[1];
    if (!href) continue;
    try {
      const absolute = new URL(href, baseUrl);
      if (!["http:", "https:"].includes(absolute.protocol)) continue;
      if (isDisallowedHost(absolute.hostname)) continue;
      results.push(absolute.toString());
    } catch {}
  }

  return [...new Set(results)];
}

function extractIconLinksFromManifest(manifest, manifestUrl) {
  const icons = Array.isArray(manifest?.icons) ? manifest.icons : [];
  const candidates = [];

  for (const icon of icons) {
    if (!icon?.src) continue;
    try {
      const absolute = new URL(icon.src, manifestUrl);
      if (!["http:", "https:"].includes(absolute.protocol)) continue;
      if (isDisallowedHost(absolute.hostname)) continue;
      candidates.push({
        url: absolute.toString(),
        source: "web-manifest-icon",
      });
    } catch {}
  }

  const deduped = new Map();
  for (const candidate of candidates) {
    if (!deduped.has(candidate.url)) {
      deduped.set(candidate.url, candidate);
    }
  }
  return [...deduped.values()];
}

async function fetchAsImage(candidate) {
  try {
    const response = await fetch(candidate.url, {
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
        "X-Tool-Icon-Source": candidate.source,
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
    if (imageResponse) {
      console.info(`[tool-icon] hit host=${normalizedUrl.hostname} source=${candidate.source}`);
      return imageResponse;
    }
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
        if (imageResponse) {
          console.info(
            `[tool-icon] hit host=${normalizedUrl.hostname} source=${candidate.source}`
          );
          return imageResponse;
        }
      }

      const manifestLinks = extractManifestLinksFromHtml(html, normalizedUrl);
      for (const manifestLink of manifestLinks) {
        try {
          const manifestResponse = await fetch(manifestLink, {
            headers: {
              Accept: "application/manifest+json,application/json,text/plain,*/*",
              "User-Agent": "Mozilla/5.0 (compatible; AIKesifIconBot/1.0)",
            },
            redirect: "follow",
            cache: "force-cache",
            next: { revalidate: 86400 },
          });

          if (!manifestResponse.ok) continue;
          const manifestJson = await manifestResponse.json();
          const manifestCandidates = extractIconLinksFromManifest(
            manifestJson,
            manifestLink
          );

          for (const candidate of manifestCandidates) {
            const imageResponse = await fetchAsImage(candidate);
            if (imageResponse) {
              console.info(
                `[tool-icon] hit host=${normalizedUrl.hostname} source=${candidate.source}`
              );
              return imageResponse;
            }
          }
        } catch {}
      }

      const metaImageCandidates = extractMetaImageLinksFromHtml(html, normalizedUrl);
      for (const candidate of metaImageCandidates) {
        const imageResponse = await fetchAsImage(candidate);
        if (imageResponse) {
          console.info(
            `[tool-icon] hit host=${normalizedUrl.hostname} source=${candidate.source}`
          );
          return imageResponse;
        }
      }
    }
  } catch {}

  console.warn(`[tool-icon] miss host=${normalizedUrl.hostname}`);

  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
