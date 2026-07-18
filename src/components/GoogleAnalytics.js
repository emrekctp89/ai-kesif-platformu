'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useRef } from 'react';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-D8WD5SMS6H';

function pageview(url) {
  if (typeof window.gtag !== 'function') return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialPage = useRef(true);
  const queryString = searchParams.toString();
  const pageUrl = queryString ? `${pathname}?${queryString}` : pathname;

  useEffect(() => {
    // gtag('config') sends the first page view. Report only client-side
    // App Router navigations here so the initial visit is not counted twice.
    if (isInitialPage.current) {
      isInitialPage.current = false;
      return;
    }

    pageview(pageUrl);
  }, [pageUrl]);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `,
        }}
      />
    </>
  );
}
