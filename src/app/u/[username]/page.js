import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Award,
  MessageSquare,
  Heart,
  Image as ImageIcon,
  Mail,
  UserPlus,
} from "lucide-react";
import { startConversation } from "@/app/actions";
import { FollowButton } from "@/components/FollowButton"; // Yeni bileşeni import ediyoruz
import { BadgesShowcase } from "@/components/BadgesShowcase"; // Yeni bileşeni import ediyoruz
import { cn } from "@/lib/utils";

// Seviyelere göre özel renkler
const tierColors = {
  Newcomer: "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  Contributor:
    "bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  Expert:
    "bg-purple-200 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  Mentor:
    "bg-amber-200 text-amber-800 dark:bg-amber-700/50 dark:text-amber-300",
};
// Veri çeken fonksiyonu, takipçi sayılarını da alacak şekilde güncelliyoruz
async function getProfileData(username, currentUserId) {
  const supabase = createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    // DEĞİŞİKLİK: follower_count ve following_count'u da çekiyoruz
    .select("*, follower_count, following_count")
    .eq("username", username)
    .single();

  if (profileError || !profile) notFound();

  let isFollowing = false;
  if (currentUserId && currentUserId !== profile.id) {
    const { data: followRecord } = await supabase
      .from("followers")
      .select("*")
      .eq("follower_id", currentUserId)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = !!followRecord;
  }

  const { data: activityData } = await supabase.rpc("get_public_profile_data", {
    p_username: username,
  });

  return {
    ...profile,
    ...(activityData || {}),
    is_current_user: profile.id === currentUserId,
    is_following: isFollowing,
  };
}

export async function generateMetadata({ params }) {
  const profile = await getProfileData(params.username);
  return {
    title: `${profile.username}'in Profili | AI Keşif Platformu`,
    description:
      profile.bio ||
      `${profile.username} kullanıcısının AI Keşif Platformu'ndaki katkıları.`,
  };
}

export default async function UserProfilePage({ params }) {
  const supabase = createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const profile = await getProfileData(params.username, currentUser?.id);

  const memberSince = new Date(profile.member_since).toLocaleDateString(
    "tr-TR",
    {
      year: "numeric",
      month: "long",
    }
  );

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      {/* Kullanıcı Tanıtım Kartı */}
      <header className="flex flex-col sm:flex-row items-center gap-8 mb-12">
        <Avatar className="w-24 h-24 border-4 border-primary/20">
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback className="text-3xl">
            {profile.username?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-bold">{profile.username}</h1>
          {/* YENİ: Kullanıcı Seviyesi Rozeti */}
          {profile.tier && (
            <Badge
              className={cn(
                "text-sm",
                tierColors[profile.tier] || "bg-secondary"
              )}
            >
              {profile.tier}
            </Badge>
          )}
          <p className="text-muted-foreground mt-2">{profile.bio}</p>
          <div className="flex items-center justify-center sm:justify-start gap-4 mt-4 text-sm text-muted-foreground">
            {/* YENİ: Tıklanabilir Takipçi/Takip edilen sayaçları */}
            <Link
              href={`/u/${profile.username}/followers`}
              className="hover:text-primary"
            >
              <span className="font-bold text-foreground">
                {profile.follower_count}
              </span>{" "}
              Takipçi
            </Link>
            <Link
              href={`/u/${profile.username}/following`}
              className="hover:text-primary"
            >
              <span className="font-bold text-foreground">
                {profile.following_count}
              </span>{" "}
              Takip
            </Link>
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">
                {profile.reputation_points}
              </span>{" "}
              itibar puanı
            </div>
            <span>•</span>
            <span>{memberSince} tarihinden beri üye</span>
          </div>
        </div>
        {/* YENİ: Mesaj Gönder Butonu */}
        {/* Bu buton, sadece giriş yapmış ve kendi profiline bakmayan kullanıcılara görünür */}
        {/* YENİ: Akıllı "Takip Et" ve "Mesaj Gönder" Butonları */}
        {currentUser && !profile.is_current_user && (
          <div className="flex items-center gap-2">
            <FollowButton
              targetUserId={profile.id}
              targetUsername={profile.username}
              isInitiallyFollowing={profile.is_following}
            />
            <form
              action={async () => {
                "use server";
                await startConversation(profile.id);
              }}
            >
              <Button type="submit" variant="secondary">
                Mesaj Gönder
              </Button>
            </form>
          </div>
        )}
      </header>

      {/* YENİ: ROZETLER BÖLÜMÜ */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Kazanılan Rozetler</h2>
        <Card>
          <CardContent className="p-6">
            <BadgesShowcase badges={profile.badges} />
          </CardContent>
        </Card>
      </section>

      {/* Aktivite Akışı */}
      <div className="space-y-8">
        {/* Son Yorumlar */}
        {profile.comments?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Son Yorumları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.comments.map((comment, i) => (
                <div key={i} className="text-sm p-3 bg-muted/50 rounded-md">
                  <p className="italic">"{comment.content}"</p>
                  <Link
                    href={`/tool/${comment.tool_slug}`}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    <span className="font-semibold">{comment.tool_name}</span>{" "}
                    için yazdı.
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Son Favoriler */}
        {profile.favorites?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Son Favorileri
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {profile.favorites.map((fav, i) => (
                <Link key={i} href={`/tool/${fav.tool_slug}`}>
                  <Badge
                    variant="secondary"
                    className="hover:bg-primary hover:text-primary-foreground"
                  >
                    {fav.tool_name}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Son Eserler */}
        {profile.showcase_items?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Son Eserleri
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {profile.showcase_items.map((item) => (
                <Link key={item.id} href={`/eserler?eserId=${item.id}`}>
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="aspect-square w-full object-cover rounded-md hover:scale-105 transition-transform"
                  />
                </Link>
              ))}
            </CardContent>
          </Card>
          //</Card>
        )}
      </div>
    </div>
  );
}
