const URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aikesif.com/";

function withBase(path = "") {
  return `${URL.replace(/\/$/, "")}${path}`;
}

export async function GET() {
  const urls = [
    { url: withBase("/"), lastModified: new Date().toISOString() },
    { url: withBase("/hakkimizda"), lastModified: new Date().toISOString() },
    { url: withBase("/iletisim"), lastModified: new Date().toISOString() },
    { url: withBase("/gizlilik"), lastModified: new Date().toISOString() },
    { url: withBase("/kullanim-kosullari"), lastModified: new Date().toISOString() },
    { url: withBase("/submit"), lastModified: new Date().toISOString() },
    { url: withBase("/feedback"), lastModified: new Date().toISOString() },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ url, lastModified }) => `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastModified}</lastmod>
  </url>`
  )
  .join("")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
