//const URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3005";
const URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aikesif.com";

export async function GET() {
  const urls = [
    { url: URL, lastModified: new Date().toISOString() },
    { url: `${URL}hakkimizda`, lastModified: new Date().toISOString() },
    { url: `${URL}iletisim`, lastModified: new Date().toISOString() },
    { url: `${URL}gizlilik`, lastModified: new Date().toISOString() },
    { url: `${URL}kullanim-kosullari`, lastModified: new Date().toISOString() },
    { url: `${URL}submit`, lastModified: new Date().toISOString() },
    { url: `${URL}feedback`, lastModified: new Date().toISOString() },
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


//Eğer ileride başka ortamlar için güvenceye almak istersen şöyle yapabilirsin:
//function withBase(path = "") {
  //return `${URL.replace(/\/$/, "")}${path}`;
//}

//const urls = [
//  { url: withBase("/"), lastModified: new Date().toISOString() },
//  { url: withBase("/hakkimizda"), lastModified: new Date().toISOString() },
//  { url: withBase("/iletisim"), lastModified: new Date().toISOString() },
//  { url: withBase("/gizlilik"), lastModified: new Date().toISOString() },
//  { url: withBase("/kullanim-kosullari"), lastModified: new Date().toISOString() },
//  { url: withBase("/submit"), lastModified: new Date().toISOString() },
 // { url: withBase("/feedback"), lastModified: new Date().toISOString() },
//];

