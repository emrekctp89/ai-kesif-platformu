import "./globals.css";
import { Onest } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopLoader } from "@/components/TopLoader";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CommandPalette } from "@/components/CommandPalette";
// Yeni ipucu bileşenini import ediyoruz
import { CommandHint } from "@/components/CommandHint";
// Yeni duyuru şeridi bileşenini import ediyoruz
import { AnnouncementBanner } from "@/components/AnnouncementBanner";

const onest = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata = {
  title: "AI Keşif Platformu",
  description: "Her İhtiyaca Yönelik En İyi Yapay Zeka Araçları Dizini",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${onest.className} bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GoogleAnalytics />
          <TopLoader />
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              style: {
                background: "#333",
                color: "#fff",
              },
            }}
          />
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto p-4 md:p-6">
              {children}
            </main>
            <Footer />
          </div>

          <CommandPalette />
          {/* Yeni ipucu bileşenini buraya ekliyoruz */}
          <CommandHint />
          {/* Yeni duyuru şeridini buraya ekliyoruz */}
          <AnnouncementBanner />

          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
