/*
 * ---------------------------------------------------
 * 2. YENİ SAYFA: src/app/odul-avciligi/page.js
 * Bu, tüm aktif ödül ilanlarını listeleyen ana sayfadır.
 * ---------------------------------------------------
 */
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateBountyDialog } from "@/components/CreateBountyDialog";
import { Award, Clock } from "lucide-react";

// Veritabanından herkese açık tüm ödül ilanlarını çeken fonksiyon
async function getActiveBounties() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bounties")
    .select(
      `
            id,
            title,
            description,
            reputation_reward,
            expires_at,
            profiles ( username, avatar_url )
        `
    )
    .eq("status", "Açık")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Aktif ödüller çekilirken hata:", error);
    return [];
  }
  return data;
}

export const metadata = {
  title: "Ödül Avcılığı | AI Keşif Platformu",
  description:
    "Topluluğun yardımıyla ihtiyacınız olan yapay zeka aracını bulun ve katkıda bulunanları ödüllendirin.",
};

export default async function BountiesPage() {
  const bounties = await getActiveBounties();
  const {
    data: { user },
  } = await createClient().auth.getUser();

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Ödül Avcılığı
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Aradığınız aracı bulamıyor musunuz? Bir ödül ilanı oluşturun, topluluk
          sizin için bulsun!
        </p>
      </div>

      {user && (
        <div className="flex justify-end mb-8">
          <CreateBountyDialog />
        </div>
      )}

      <div className="space-y-6">
        {bounties.length > 0 ? (
          bounties.map((bounty) => (
            <Link
              key={bounty.id}
              href={`/odul-avciligi/${bounty.id}`}
              className="block"
            >
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle>{bounty.title}</CardTitle>
                  <CardDescription className="line-clamp-2 pt-1">
                    {bounty.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={bounty.profiles.avatar_url} />
                      <AvatarFallback>
                        {bounty.profiles.username
                          ?.substring(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{bounty.profiles.username}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                      <Award className="w-4 h-4" />
                      {bounty.reputation_reward} Puan
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {new Date(bounty.expires_at).toLocaleDateString("tr-TR")}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-16">
            Şu anda aktif bir ödül ilanı bulunmuyor.
          </p>
        )}
      </div>
    </div>
  );
}
