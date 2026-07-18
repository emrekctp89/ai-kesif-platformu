import './globals.css';
import { Onest } from 'next/font/google';
import Script from 'next/script';
import { generateStructuredData } from '@/utils/seo';
import { getSiteOrigin } from '@/utils/siteUrl';

const siteUrl = getSiteOrigin();

const onest = Onest({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
});

export const metadata = {
  metadataBase: new URL(siteUrl),
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020817' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  const organizationSchema = generateStructuredData('Organization', {});
  const websiteSchema = generateStructuredData('WebSite', {});

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <Script
          id="consentmanager-cmp"
          strategy="beforeInteractive"
          type="text/javascript"
          data-cmp-ab="1"
          src="https://cdn.consentmanager.net/delivery/autoblocking/2476a7ec02ec4.js"
          data-cmp-host="d.delivery.consentmanager.net"
          data-cmp-cdn="cdn.consentmanager.net"
          data-cmp-codesrc="16"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />

        <meta
          name="google-site-verification"
          content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION}
        />
        <meta name="msvalidate.01" content={process.env.NEXT_PUBLIC_MSVALIDATE} />
        <meta name="theme-color" content="#020817" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AI Keşif" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="alternate" type="application/rss+xml" href="/rss.xml" />
      </head>
      <body className={`${onest.className} bg-background text-foreground`}>{children}</body>
    </html>
  );
}
