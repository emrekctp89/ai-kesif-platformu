import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { DeleteCommentButton } from "@/components/DeleteCommentButton";
import { DeletePromptButton } from "@/components/DeletePromptButton";
import { AvatarUploader } from "@/components/AvatarUploader";
import { CollectionManager } from "@/components/CollectionManager";
import { ShowcaseManager } from "@/components/ShowcaseManager";
import { ArrowUp, Star } from "lucide-react";
import { ReputationInfo } from "@/components/ReputationInfo"; // Yeni bileşeni import ediyoruz
import { ProfileEditor } from "@/components/ProfileEditor"; // Yeni düzenleyici bileşenini import ediyoruz

// Kullanıcının oyladığı araçları çeken fonksiyon
async function getUserRatedTools(userId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ratings")
    .select(`rating, tools (id, name, slug, description)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Puanlanan araçlar çekilirken hata:", error);
    return [];
  }
  return data.map((item) => ({ ...item.tools, user_rating: item.rating }));
}

// Kullanıcının favori araçlarını çeken fonksiyon
async function getUserFavoriteTools(userId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select(`tools (id, name, slug, description, categories (name))`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Favori araçlar çekilirken hata:", error);
    return [];
  }
  return data.map((item) => item.tools);
}

// Kullanıcının yorumlarını çeken fonksiyon
async function getUserComments(userId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .select(`id, content, created_at, tools ( name, slug )`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Kullanıcı yorumları çekilirken hata:", error);
    return [];
  }
  return data;
}

// YENİ: Kullanıcının son puan olaylarını çeken fonksiyon
async function getUserReputationEvents(userId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reputation_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5); // Son 5 olayı alıyoruz

  if (error) {
    console.error("Kullanıcı puan geçmişi çekilirken hata:", error);
    return [];
  }
  return data;
}

// Kullanıcının tüm profil bilgilerini (username, bio dahil) çeken fonksiyon
async function getUserProfile(userId) {
  if (!userId) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url, reputation_points, username, bio")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Profil verisi çekilirken hata:", error);
    return null;
  }
  return data;
}

// Kullanıcının koleksiyonlarını çeken fonksiyon
async function getUserCollections(userId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, title, is_public")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Koleksiyonlar çekilirken hata:", error);
    return [];
  }
  return data;
}

// Kullanıcının kendi gönderdiği prompt'ları çeken fonksiyon
async function getUserPrompts(userId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("prompts")
    .select(`id, title, vote_count, tools ( name, slug )`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Kullanıcı prompt'ları çekilirken hata:", error);
    return [];
  }
  return data;
}

// Kullanıcının eserlerini çeken fonksiyon
async function getUserShowcaseItems(userId) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_user_showcase_items", {
    p_user_id: userId,
  });
  if (error) {
    console.error("Kullanıcı eserleri çekilirken hata:", error);
    return [];
  }
  return data;
}

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  // Tüm verileri paralel olarak çekiyoruz
  const [
    ratedTools,
    favoriteTools,
    userComments,
    profile,
    collections,
    userPrompts,
    showcaseItems,
    reputationEvents,
  ] = await Promise.all([
    getUserRatedTools(user.id),
    getUserFavoriteTools(user.id),
    getUserComments(user.id),
    getUserProfile(user.id),
    getUserCollections(user.id),
    getUserPrompts(user.id),
    getUserShowcaseItems(user.id),
    getUserReputationEvents(user.id),
  ]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Profilim</h1>
        <p className="text-muted-foreground">Hoş geldin, {user.email}</p>
      </div>

      {/* DEĞİŞİKLİK: Ayrı kartlar yerine tek bir profil yönetim kartı */}
      <ProfileEditor user={user} profile={profile} />

      <ReputationInfo
        reputationPoints={profile?.reputation_points || 0}
        events={reputationEvents}
      />

      <Card>
        <CardHeader>
          <CardTitle>Koleksiyon Yönetimi</CardTitle>
        </CardHeader>
        <CardContent>
          <CollectionManager collections={collections} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eserlerim ({showcaseItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ShowcaseManager items={showcaseItems} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paylaştığın Prompt'lar ({userPrompts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {userPrompts.length > 0 ? (
            <div className="space-y-4">
              {userPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="p-4 rounded-lg border flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-lg">{prompt.title}</p>
                    <p className="text-sm text-muted-foreground">
                      <Link
                        href={`/tool/${prompt.tools.slug}`}
                        className="hover:underline"
                      >
                        {prompt.tools.name}
                      </Link>{" "}
                      aracına ait.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm font-bold">
                      <ArrowUp className="w-4 h-4 text-primary" />
                      {prompt.vote_count}
                    </div>
                    <DeletePromptButton
                      promptId={prompt.id}
                      toolSlug={prompt.tools.slug}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Henüz hiç prompt paylaşmadınız.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yaptığın Yorumlar ({userComments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {userComments.length > 0 ? (
            <div className="space-y-4">
              {userComments.map((comment) => (
                <div key={comment.id} className="p-4 rounded-lg border">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        <Link
                          href={`/tool/${comment.tools.slug}`}
                          className="font-semibold hover:underline"
                        >
                          {comment.tools.name}
                        </Link>{" "}
                        aracına yapılan yorum:
                      </p>
                      <p className="text-foreground mt-2 italic">
                        "{comment.content}"
                      </p>
                    </div>
                    <DeleteCommentButton commentId={comment.id} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Henüz hiçbir yorum yapmadınız.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Favori Araçların ({favoriteTools.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {favoriteTools.length > 0 ? (
            <div className="space-y-4">
              {favoriteTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <Link href={`/tool/${tool.slug}`} className="group">
                      <h3 className="font-semibold text-lg group-hover:text-primary">
                        {tool.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {tool.description}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground w-fit shrink-0 ml-4">
                    {tool.categories.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Henüz hiçbir aracı favorilerinize eklemediniz.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Puanladığın Araçlar ({ratedTools.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ratedTools.length > 0 ? (
            <div className="space-y-4">
              {ratedTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <Link href={`/tool/${tool.slug}`} className="group">
                      <h3 className="font-semibold text-lg group-hover:text-primary">
                        {tool.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {tool.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-lg shrink-0 ml-4">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />{" "}
                    <span className="font-bold">{tool.user_rating}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Henüz hiçbir araca puan vermediniz.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Tehlikeli Bölge</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-between items-center">
          <p className="text-sm">
            Hesabınızı ve tüm verilerinizi kalıcı olarak silin.
          </p>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}
