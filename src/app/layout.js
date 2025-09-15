import "./globals.css";
import { Onest } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopLoader } from "@/components/TopLoader";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import Footer from "@/components/Footer";

const onest = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata = {
  title: "AI Keşif Platformu",
  description: "Her İhtiyaca Yönelik En İyi Yapay Zeka Araçları Dizini",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#000000" />
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

          {/* İçerik */}
          <main className="flex-1 min-h-screen">
            <div className="container mx-auto p-4 md:p-6">{children}</div>
          </main>

          {/* Footer kalıyor */}
          <Footer />

          <AnnouncementBanner />
          <PushNotificationManager />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
