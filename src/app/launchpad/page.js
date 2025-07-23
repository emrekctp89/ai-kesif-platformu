/*
 * ---------------------------------------------------
 * 2. YENİ SAYFA: src/app/launchpad/page.js
 * Bu sayfa, veriyi çeker ve sekmeli yapıyı oluşturur.
 * ---------------------------------------------------
 */
import { createClient } from "@/utils/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LaunchCard } from "@/components/LaunchCard"; // Yeni bileşeni import ediyoruz
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button"; // Button'ı import ediyoruz
import Link from "next/link"; // Link'i import ediyoruz

// Veritabanındaki RPC fonksiyonunu çağıran fonksiyon
async function getLaunches(startDate, endDate, userId) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_launches", {
    p_start_date: startDate,
    p_end_date: endDate,
    p_user_id: userId,
  });

  if (error) {
    console.error("Lansmanlar çekilirken hata:", error);
    return [];
  }
  return data;
}

export const metadata = {
  title: "AI Launchpad | AI Keşif Platformu",
  description:
    "Yapay zeka dünyasındaki en yeni ve en heyecan verici araç lansmanlarını keşfedin, oylayın ve ilk deneyenlerden olun.",
};

export default async function LaunchpadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Hem bugünün hem de bu haftanın lansmanlarını paralel olarak çekiyoruz
  const [todayLaunches, weekLaunches] = await Promise.all([
    getLaunches(today, today, user?.id),
    getLaunches(sevenDaysAgo, today, user?.id),
  ]);

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <div className="text-center mb-12">
        <Rocket className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          AI Launchpad
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Yapay zeka dünyasındaki en yeni ürünleri keşfedin. Her gün yeni bir
          lansman.
        </p>
      </div>
      {/* YENİ: "Lansman Yap" butonu */}
      {user && (
        <div className="flex justify-center mb-8">
          <Button asChild size="lg">
            <Link href="/launchpad/submit">
              <Rocket className="mr-2 h-5 w-5" />
              Yeni Lansman Yap
            </Link>
          </Button>
        </div>
      )}
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">Bugün</TabsTrigger>
          <TabsTrigger value="week">Bu Hafta</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <div className="space-y-4 pt-6">
            {todayLaunches.length > 0 ? (
              todayLaunches.map((launch) => (
                <LaunchCard
                  key={launch.id}
                  launch={launch}
                  user={user}
                  isVoted={launch.is_voted}
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Bugün için henüz bir lansman yok.
              </p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="week">
          <div className="space-y-4 pt-6">
            {weekLaunches.length > 0 ? (
              weekLaunches.map((launch) => (
                <LaunchCard
                  key={launch.id}
                  launch={launch}
                  user={user}
                  isVoted={launch.is_voted}
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Bu hafta için henüz bir lansman yok.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
