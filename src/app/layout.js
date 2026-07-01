import "./globals.css";
import { Onest } from "next/font/google";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopLoader } from "@/components/TopLoader";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { generatePageMetadata, generateStructuredData, siteConfig } from "@/utils/seo";

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.aikeşif.com"
).origin;

const onest = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

// Generate metadata using SEO utilities
const seoMetadata = generatePageMetadata({
  title: null, // Will use default
  description: "İhtiyacınıza uygun yapay zeka araçlarını keşfedin, karşılaştırın ve doğru aracı daha hızlı bulun.",
  path: "/",
  type: "website",
});

export const metadata = {
  metadataBase: new URL(siteUrl),
  ...seoMetadata,
  applicationName: "AI Keşif Platformu",
  title: {
    default: "AI Keşif | Yapay Zeka Araçları Rehberi",
    template: "%s | AI Keşif",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI Keşif Platformu",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020817" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default async function RootLayout({ children }) {
  await cookies();

  // Generate structured data for the organization
  const organizationSchema = generateStructuredData("Organization", {});
  const websiteSchema = generateStructuredData("WebSite", {});

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* Structured Data (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />

        {/* Search Engine Verification Tags */}
        <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} />
        <meta name="msvalidate.01" content={process.env.NEXT_PUBLIC_MSVALIDATE} />

        {/* Additional SEO Tags */}
        <meta name="theme-color" content="#020817" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AI Keşif" />

        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />

        {/* RSS Feed */}
        <link rel="alternate" type="application/rss+xml" href="/rss.xml" />
      </head>
      <body className={`${onest.className} bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GoogleAnalytics />
          <TopLoader />
          <Toaster position="top-center" />

          <div className="relative flex min-h-screen flex-col">
            {/* Skip to main content link */}
            <a
              href="#main-content"
              className="sr-only fixed left-4 top-4 z-[100] rounded-md bg-background px-4 py-2 font-semibold text-foreground shadow-lg focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              İçeriğe geç
            </a>
            
            <Header />
            
            <main id="main-content" tabIndex={-1} className="flex-1">
              <div className="container mx-auto p-4 md:p-6">{children}</div>
            </main>
            
            <Footer />
          </div>

          <AnnouncementBanner />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
