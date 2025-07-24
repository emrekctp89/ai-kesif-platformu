import "./globals.css";
import { Onest } from "next/font/google";
import { createClient } from "@/utils/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopLoader } from "@/components/TopLoader";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CommandPalette } from "@/components/CommandPalette";
import { CommandHint } from "@/components/CommandHint";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
// Yeni Karşılama Asistanı bileşenini import ediyoruz
import { OnboardingAssistant } from "@/components/OnboardingAssistant";
import { VoiceAgent } from '@/components/VoiceAgent';
import { AiConcierge } from '@/components/AiConcierge'; // Yeni bileşeni import ediyoruz
import { PushNotificationManager } from '@/components/PushNotificationManager'; // Yeni bildirim yöneticisini import ediyoruz
import Link from "next/link";


const onest = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata = {
  title: "AI Keşif Platformu",
  description: "Her İhtiyaca Yönelik En İyi Yapay Zeka Araçları Dizini",
   // YENİ: PWA için manifest dosyasını ekliyoruz
  manifest: '/manifest.json',
};


export default async function RootLayout({ children }) {
  const supabase = createClient();
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
        {/* YENİ: iOS cihazları için tema rengi */}
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

          {/* DEĞİŞİKLİK: Karşılama Asistanını Koşullu Olarak Gösterme */}
          {showOnboarding ? (
            <OnboardingAssistant />
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

          <CommandPalette />
          <CommandHint />
          <AnnouncementBanner />
          {/* Yeni Sesli Agent'ı buraya ekliyoruz. Sitenin her yerinden erişilebilir olacak. */}
          {/*<VoiceAgent />*/}
          <PushNotificationManager />
                   {/* DEĞİŞİKLİK: AI Konsiyerj'e kullanıcı bilgisini aktarıyoruz */}
          <AiConcierge user={user} />

          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
