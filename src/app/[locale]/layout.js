import '../globals.css';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { Onest } from 'next/font/google';
import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TopLoader } from '@/components/TopLoader';
import { Analytics } from '@vercel/analytics/react';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { EnglishExperienceNotice } from '@/components/EnglishExperienceNotice';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { generatePageMetadata, generateStructuredData } from '@/utils/seo';
import { getSiteOrigin } from '@/utils/siteUrl';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { KasifWidget } from '@/components/kasif/KasifWidget';

const siteUrl = getSiteOrigin();
const onest = Onest({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
});
const kasifWidgetEnabled =
  process.env.KASIF_ENABLED === 'true' || process.env.LOCAL_KASIF_ENABLED === 'true';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Hero' });

  const seoMetadata = generatePageMetadata({
    title: null,
    description: t('subtitle'),
    path: locale === 'en' ? '/en' : '/',
    locale,
    type: 'website',
  });
  const trUrl = siteUrl;
  const enUrl = `${siteUrl}/en`;
  const pageUrl = locale === 'en' ? enUrl : trUrl;

  return {
    metadataBase: new URL(siteUrl),
    ...seoMetadata,
    alternates: {
      canonical: pageUrl,
      languages: {
        tr: trUrl,
        en: enUrl,
        'x-default': trUrl,
      },
    },
    applicationName: 'AI Keşif Platformu',
    title: {
      default: `AI Keşif | ${t('title')}`,
      template: '%s | AI Keşif',
    },
    icons: {
      icon: '/icon.svg',
      shortcut: '/icon.svg',
      apple: '/apple-icon.png',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'AI Keşif Platformu',
    },
    formatDetection: {
      telephone: false,
    },
  };
}

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

export default async function LocaleLayout(props) {
  const { children, params } = props;
  const { locale } = await params;

  await cookies();
  const messages = await getMessages();
  const organizationSchema = generateStructuredData('Organization', {});
  const websiteSchema = generateStructuredData('WebSite', { locale });

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <Script id="google-tag-manager" strategy="beforeInteractive" suppressHydrationWarning>
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-T6J56FT3');`}
        </Script>
        <Script
          id="consentmanager-cmp"
          strategy="beforeInteractive"
          type="text/javascript"
          data-cmp-ab="1"
          src="https://cdn.consentmanager.net/delivery/autoblocking/2476a7ec02ec4.js"
          data-cmp-host="d.delivery.consentmanager.net"
          data-cmp-cdn="cdn.consentmanager.net"
          data-cmp-codesrc="16"
          suppressHydrationWarning
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
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
      <body className={`${onest.className} bg-background text-foreground`}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-T6J56FT3"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Bug fix: GoogleAnalytics useSearchParams() kullanıyor, Next.js bunun
          bir Suspense sınırı içinde olmasını gerektiriyor — aksi halde statik
          render/build sırasında hataya yol açabilir. */}
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
          <TopLoader />
          <Toaster position="top-center" />

          <div className="relative flex min-h-screen flex-col">
            <a
              href="#main-content"
              className="sr-only fixed left-4 top-4 z-[100] rounded-md bg-background px-4 py-2 font-semibold text-foreground shadow-lg focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              İçeriğe geç
            </a>

            <NextIntlClientProvider messages={messages}>
              <Header />
              {locale === 'en' && <EnglishExperienceNotice />}

              <main id="main-content" tabIndex={-1} className="flex-1">
                <div className="container mx-auto p-4 md:p-6">{children}</div>
              </main>

              <Footer />
              {/* Must stay inside NextIntlClientProvider — uses useTranslations('Common'). */}
              <AnnouncementBanner />
              {/* Global floating Kâşif chat widget; gated by the same flag as /kasif-deney. */}
              <Suspense fallback={null}>
                <KasifWidget enabled={kasifWidgetEnabled} />
              </Suspense>
            </NextIntlClientProvider>
          </div>

          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
