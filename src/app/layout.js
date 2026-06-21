import "./globals.css";
import { Onest } from "next/font/google";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopLoader } from "@/components/TopLoader";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { PushNotificationManager } from "@/components/PushNotificationManager"; // Yeni bildirim yöneticisini import ediyoruz

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
  title: "AI Keşif Platformu",
  description:
    "İhtiyacınıza uygun yapay zeka araçlarını keşfedin, karşılaştırın ve doğru aracı daha hızlı bulun.",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: "AI Keşif Platformu",
    title: "AI Keşif Platformu",
    description:
      "İhtiyacınıza uygun yapay zeka araçlarını keşfedin ve doğru aracı daha hızlı bulun.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Keşif Platformu",
    description:
      "İhtiyacınıza uygun yapay zeka araçlarını keşfedin ve doğru aracı daha hızlı bulun.",
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
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Kullanıcının profilinden, karşılama sürecini tamamlayıp tamamlamadığını kontrol ediyoruz.
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single()
    : { data: null };

  const showOnboarding = user && !profile?.onboarding_completed;

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

          {/* DEĞİŞİKLİK: Karşılama Asistanını Koşullu Olarak Gösterme */}
          {showOnboarding ? (
            // <OnboardingAssistant /> // Şu anda yorum satırı halinde
            null
          ) : (
            // Eğer karşılama süreci tamamlanmışsa veya kullanıcı misafirse, normal siteyi göster
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">
                <div className="container mx-auto p-4 md:p-6">{children}</div>
              </main>
              <Footer />
            </div>
          )}

          {/* <CommandPalette />
              <CommandHint /> */}
          <AnnouncementBanner />
          {/* Yeni Sesli Agent'ı buraya ekliyoruz. Sitenin her yerinden erişilebilir olacak. */}
          {/* <VoiceAgent /> */}
          <PushNotificationManager />
          {/* DEĞİŞİKLİK: AI Konsiyerj'e kullanıcı bilgisini aktarıyoruz */}
          {/* <AiConcierge user={user} /> */}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
