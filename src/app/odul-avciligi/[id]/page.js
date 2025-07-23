import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
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
import { BountySubmissions } from "@/components/BountySubmissions";
import { Badge } from "@/components/ui/badge";
import { Award, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// DEĞİŞİKLİK: Bu fonksiyon artık bizim akıllı RPC fonksiyonumuzu çağırıyor.
async function getBountyDetails(bountyId) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(
    "get_bounty_details_with_submissions",
    { p_bounty_id: bountyId }
  );

  if (error || !data) {
    console.error("Ödül detayları çekilirken hata:", error);
    notFound();
  }
  return data;
}

// Seçim menüsü için tüm araçları çeken fonksiyon
async function getAllToolsForSelect() {
  const supabase = createClient();
  const { data } = await supabase
    .from("tools")
    .select("id, name")
    .eq("is_approved", true)
    .order("name");
  return data || [];
}

export default async function BountyDetailPage({ params }) {
  const bounty = await getBountyDetails(params.id);
  const allTools = await getAllToolsForSelect();
  const {
    data: { user },
  } = await createClient().auth.getUser();

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <header className="mb-8">
        <Badge
          variant={bounty.status === "Açık" ? "default" : "secondary"}
          className="mb-2"
        >
          {bounty.status}
        </Badge>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          {bounty.title}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {bounty.description}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold">İlan Sahibi:</span>
            <Link
              href={`/u/${bounty.profiles.username}`}
              className="flex items-center gap-2 hover:text-primary"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={bounty.profiles.avatar_url} />
                <AvatarFallback>
                  {bounty.profiles.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{bounty.profiles.username}</span>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <Award className="w-4 h-4" /> Ödül: {bounty.reputation_reward} Puan
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Son Tarih:{" "}
            {new Date(bounty.expires_at).toLocaleDateString("tr-TR")}
          </div>
        </div>
      </header>

      <Separator className="my-8" />

      <BountySubmissions
        bounty={bounty}
        submissions={bounty.bounty_submissions}
        allTools={allTools}
        currentUser={user}
      />
    </div>
  );
}
