import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Belirli bir kullanıcının takip ettiklerini çeken fonksiyon
async function getFollowing(username) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
            following:followers!follower_id(
                followed:profiles!following_id(id, username, email, avatar_url)
            )
        `
    )
    .eq("username", username)
    .single();

  if (error || !data) {
    notFound();
  }
  return data.following.map((f) => f.followed);
}

export default async function FollowingPage({ params }) {
  const following = await getFollowing(params.username);

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">
        <Link
          href={`/u/${params.username}`}
          className="text-primary hover:underline"
        >
          {params.username}
        </Link>{" "}
        kullanıcısının takip ettikleri
      </h1>
      <div className="space-y-4">
        {following.map((user) => (
          <Link key={user.id} href={`/u/${user.username}`} className="block">
            <Card className="hover:bg-muted/50">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>
                    {(user.username || user.email)
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold">{user.username || user.email}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
