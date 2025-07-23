import { createClient } from "@/utils/supabase/server";
import { UserCard } from "@/components/UserCard";
import { Users, Star, TrendingUp } from "lucide-react";

// Veritabanındaki RPC fonksiyonlarını çağıran fonksiyonlar
async function getDiscoveryData(userId) {
  const supabase = createClient();
  const [
    { data: weeklyTop },
    { data: mostFollowed },
    { data: newestMembers },
    { data: followingList },
  ] = await Promise.all([
    supabase.rpc("get_weekly_top_contributors"),
    supabase.rpc("get_most_followed_users"),
    supabase.rpc("get_newest_members"),
    userId
      ? supabase
          .from("followers")
          .select("following_id")
          .eq("follower_id", userId)
      : Promise.resolve({ data: [] }),
  ]);

  const followingSet = new Set(followingList?.map((f) => f.following_id) || []);

  return {
    weeklyTop: weeklyTop || [],
    mostFollowed: mostFollowed || [],
    newestMembers: newestMembers || [],
    followingSet,
  };
}

export const metadata = {
  title: "Topluluk | AI Keşif Platformu",
  description:
    "Platformun en aktif, en popüler ve en yeni üyelerini keşfedin ve onlarla bağlantı kurun.",
};

export default async function CommunityPage() {
  const supabase = createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const { weeklyTop, mostFollowed, newestMembers, followingSet } =
    await getDiscoveryData(currentUser?.id);

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          Topluluğu Keşfet
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Platformumuzun en değerli üyelerini, yükselen yıldızlarını ve yeni
          yüzlerini tanıyın.
        </p>
      </div>

      <div className="space-y-16">
        {/* Haftanın Yıldızları */}
        {weeklyTop.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              Haftanın Yıldızları
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {weeklyTop.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  currentUser={currentUser}
                  isInitiallyFollowing={followingSet.has(user.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* En Çok Takip Edilenler */}
        {mostFollowed.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6 flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-400" />
              En Popüler Üyeler
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {mostFollowed.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  currentUser={currentUser}
                  isInitiallyFollowing={followingSet.has(user.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Yeni Üyeler */}
        {newestMembers.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6 flex items-center gap-3">
              <Users className="w-8 h-8 text-green-500" />
              Aramıza Yeni Katılanlar
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {newestMembers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  currentUser={currentUser}
                  isInitiallyFollowing={followingSet.has(user.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
