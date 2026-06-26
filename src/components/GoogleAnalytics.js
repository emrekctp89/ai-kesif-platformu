"use client";

import { usePathname } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import Script from "next/script";

// Sayfa görüntüleme olayını Google Analytics'e gönderen yardımcı fonksiyon
const pageview = (GA_MEASUREMENT_ID, url) => {
  if (typeof window.gtag !== "function") return;

  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
};

export const GoogleAnalytics = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID;
  const queryString = searchParams.toString();
  const pageUrl = queryString ? `${pathname}?${queryString}` : pathname;

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    // Sayfa her değiştiğinde bu fonksiyonu çağır
    pageview(GA_MEASUREMENT_ID, pageUrl);
  }, [pageUrl, GA_MEASUREMENT_ID]);

  return (
    <>
      <Script
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${GA_MEASUREMENT_ID}', {
                send_page_view: false,
            });
          `,
        }}
      />
    </>
  );
};
