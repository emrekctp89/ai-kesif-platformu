import { cookies } from 'next/headers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TopLoader } from '@/components/TopLoader';
import { Analytics } from '@vercel/analytics/react';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { generatePageMetadata } from '@/utils/seo';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aikeşif.com').origin;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Hero' });

  const seoMetadata = generatePageMetadata({
    title: null,
    description: t('subtitle'),
    path: locale === 'en' ? '/en' : '/',
    type: 'website',
  });

  return {
    metadataBase: new URL(siteUrl),
    ...seoMetadata,
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

export default async function LocaleLayout(props) {
  const { children, params } = props;
  await params;

  await cookies();
  const messages = await getMessages();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <GoogleAnalytics />
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

          <main id="main-content" tabIndex={-1} className="flex-1">
            <div className="container mx-auto p-4 md:p-6">{children}</div>
          </main>

          <Footer />
        </NextIntlClientProvider>
      </div>

      <AnnouncementBanner />
      <Analytics />
    </ThemeProvider>
  );
}
