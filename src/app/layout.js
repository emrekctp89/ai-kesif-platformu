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
import Canonical from "@/components/Canonical";

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.aikeşif.com"
).origin;

const onest = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "AI Keşif Platformu",
  title: {
    default: "AI Keşif | Yapay Zeka Araçları Rehberi",
    template: "%s | AI Keşif",
  },
  description:
    "İhtiyacınıza uygun yapay zeka araçlarını keşfedin, karşılaştırın ve doğru aracı daha hızlı bulun.",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: "AI Keşif Platformu",
    title: "AI Keşif | Yapay Zeka Araçları Rehberi",
    description:
      "İhtiyacınıza uygun yapay zeka araçlarını keşfedin ve doğru aracı daha hızlı bulun.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AI Keşif yapay zeka araçları platformu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Keşif | Yapay Zeka Araçları Rehberi",
    description:
      "İhtiyacınıza uygun yapay zeka araçlarını keşfedin ve doğru aracı daha hızlı bulun.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  themeColor: "#000000",
};

export default async function RootLayout({ children }) {
  await cookies();

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <Canonical />
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
