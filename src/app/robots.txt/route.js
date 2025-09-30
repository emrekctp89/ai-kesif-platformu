// Bu dosya, sitenizin kökünde /robots.txt olarak sunulur.

//import process from "node:process";

//export default function robots() {
  //const URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3005";
  //const URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aikeşif.com/";
  //return {
   // rules: {
      // Tüm arama motorlarına (User-agent: *)
    //  userAgent: "*",
      // Ana sayfa ve tüm alt sayfaları taramasına izin ver
    //  allow: "/",
      // Ancak bu özel sayfaları taramasını engelle
    //  disallow: [
    //    "/admin/",
    //    "/dashboard/",
    //    "/profile/",
    //    "/login",
     //   "/signup",
    //    "/forgot-password",
     //   "/reset-password",
    //  ],
  //  },
    // Site haritasının yerini de burada belirtiyoruz
  //  sitemap: `${URL}/sitemap.xml`,
 // };
//}


// src/app/robots.txt/route.js

const URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aikeşif.com/";

export async function GET() {
  const content = `
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /profile/
Disallow: /login
Disallow: /signup
Disallow: /forgot-password
Disallow: /reset-password

Sitemap: ${URL}/sitemap.xml
`;

  return new Response(content.trim(), {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

