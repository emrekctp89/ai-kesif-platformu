import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";

// Veritabanından en yüksek puanlı kullanıcıları çeken fonksiyon
async function getTopUsers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("email, avatar_url, reputation_points")
    .order("reputation_points", { ascending: false })
    .limit(10); // İlk 10 kullanıcıyı alıyoruz

  if (error) {
    console.error("Liderlik tablosu çekilirken hata:", error);
    return [];
  }
  return data;
}

export const metadata = {
  title: "Liderlik Tablosu | AI Keşif Platformu",
  description:
    "Platforma en çok katkıda bulunan, en itibarlı kullanıcıları keşfedin.",
};

export default async function LeaderboardPage() {
  const topUsers = await getTopUsers();

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <div className="text-center mb-12">
        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Liderlik Tablosu
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Platformumuza en çok katkıda bulunan en değerli kullanıcılarımız.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {topUsers.map((user, index) => {
              const fallback = user.email.substring(0, 2).toUpperCase();
              return (
                <div
                  key={user.email}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                >
                  <div className="font-bold text-lg w-8 text-center">
                    {index + 1}
                  </div>
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{fallback}</AvatarFallback>
                  </Avatar>
                  <p className="flex-1 font-medium">{user.email}</p>
                  <div className="font-bold text-primary">
                    {user.reputation_points} Puan
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
