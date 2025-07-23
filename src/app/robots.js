// Bu dosya, sitenizin kökünde /robots.txt olarak sunulur.

import process from "node:process";

export default function robots() {
  const URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3005";

  return {
    rules: {
      // Tüm arama motorlarına (User-agent: *)
      userAgent: "*",
      // Ana sayfa ve tüm alt sayfaları taramasına izin ver
      allow: "/",
      // Ancak bu özel sayfaları taramasını engelle
      disallow: [
        "/admin/",
        "/dashboard/",
        "/profile/",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
      ],
    },
    // Site haritasının yerini de burada belirtiyoruz
    sitemap: `${URL}/sitemap.xml`,
  };
}
