import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageSquare,
  Star,
  Image as ImageIcon,
  Users,
  Rss,
} from "lucide-react";
import Image from "next/image";

// Veritabanındaki RPC fonksiyonunu, artık kullanıcı ID'si ile çağıran fonksiyon
async function getActivityFeedData(userId) {
  const supabase = createClient();
  // DEĞİŞİKLİK: Fonksiyona artık p_user_id'yi gönderiyoruz
  const { data, error } = await supabase.rpc("get_community_activity_feed", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Kişiselleştirilmiş akış çekilirken hata:", error);
    return [];
  }
  return data;
}

const eventComponents = {
  new_favorite: ({ event }) => (
    <CardContent className="p-4 flex items-center gap-4">
      <Heart className="w-6 h-6 text-red-500" />
      <div>
        <p className="text-sm">
          <Link
            href={`/u/${event.username}`}
            className="font-bold hover:underline"
          >
            {event.username || "Bir kullanıcı"}
          </Link>
          ,{" "}
          <Link
            href={`/tool/${event.details.tool_slug}`}
            className="font-semibold text-primary hover:underline"
          >
            {event.details.tool_name}
          </Link>{" "}
          aracını favorilerine ekledi.
        </p>
        <time className="text-xs text-muted-foreground">
          {new Date(event.event_time).toLocaleDateString("tr-TR")}
        </time>
      </div>
    </CardContent>
  ),
  new_comment: ({ event }) => (
    <CardContent className="p-4 flex items-center gap-4">
      <MessageSquare className="w-6 h-6 text-blue-500" />
      <div>
        <p className="text-sm">
          <Link
            href={`/u/${event.username}`}
            className="font-bold hover:underline"
          >
            {event.username || "Bir kullanıcı"}
          </Link>
          ,{" "}
          <Link
            href={`/tool/${event.details.tool_slug}`}
            className="font-semibold text-primary hover:underline"
          >
            {event.details.tool_name}
          </Link>{" "}
          aracına yeni bir yorum yaptı.
        </p>
        <p className="text-xs italic text-muted-foreground mt-1 line-clamp-2">
          &quot;{event.details.comment_content}&quot;
        </p>
        <time className="text-xs text-muted-foreground mt-2 block">
          {new Date(event.event_time).toLocaleDateString("tr-TR")}
        </time>
      </div>
    </CardContent>
  ),
  new_showcase: ({ event }) => (
    <CardContent className="p-4 flex items-center gap-4">
      <ImageIcon className="w-6 h-6 text-green-500" />
      <div>
        <p className="text-sm">
          <Link
            href={`/u/${event.username}`}
            className="font-bold hover:underline"
          >
            {event.username || "Bir kullanıcı"}
          </Link>
          ,{" "}
          <Link
            href={`/eserler?eserId=${event.details.item_id}`}
            className="font-semibold text-primary hover:underline"
          >
            {event.details.item_title}
          </Link>{" "}
          adlı yeni bir eser paylaştı.
        </p>
        <time className="text-xs text-muted-foreground">
          {new Date(event.event_time).toLocaleDateString("tr-TR")}
        </time>
      </div>
      {event.details.item_image_url && (
        <Link href={`/eserler?eserId=${event.details.item_id}`}>
          <Image
            src={event.details.item_image_url}
            alt={event.details.item_title}
            width={48}
            height={48}
            className="w-12 h-12 object-cover rounded-md ml-auto"
          />
        </Link>
      )}
    </CardContent>
  ),
  new_prompt: ({ event }) => (
    <CardContent className="p-4 flex items-center gap-4">
      <Star className="w-6 h-6 text-yellow-500" />
      <div>
        <p className="text-sm">
          <Link
            href={`/u/${event.username}`}
            className="font-bold hover:underline"
          >
            {event.username || "Bir kullanıcı"}
          </Link>
          ,{" "}
          <Link
            href={`/tool/${event.details.tool_slug}`}
            className="font-semibold text-primary hover:underline"
          >
            {event.details.tool_name}
          </Link>{" "}
          için yeni bir prompt paylaştı: &quot;{event.details.prompt_title}
          &quot;
        </p>
        <time className="text-xs text-muted-foreground">
          {new Date(event.event_time).toLocaleDateString("tr-TR")}
        </time>
      </div>
    </CardContent>
  ),
};

export const metadata = {
  title: "Akış | AI Keşif Platformu",
  description:
    "Takip ettiğiniz kişilerin en son aktivitelerini, yeni favorilerini, yorumlarını ve daha fazlasını keşfedin.",
};

export default async function ActivityFeedPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Akış sayfasını görmek için giriş yapmalısınız.");
  }

  const feedItems = await getActivityFeedData(user.id);

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-4">
          <Rss className="w-10 h-10" />
          Sizin İçin Akış
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Takip ettiğiniz kişilerden en son aktiviteler.
        </p>
      </div>
      <div className="space-y-4">
        {feedItems.length > 0 ? (
          feedItems.map((event, index) => {
            const EventComponent = eventComponents[event.event_type];
            return EventComponent ? (
              <Card
                key={`${event.event_type}-${index}-${event.event_time}`}
                className="transition-all hover:shadow-md"
              >
                <EventComponent event={event} />
              </Card>
            ) : null;
          })
        ) : (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Akışınız Henüz Boş</h3>
            <p className="text-muted-foreground mt-2">
              İlgi çekici bulduğunuz kullanıcıları takip etmeye başlayın. <br />{" "}
              Onların aktiviteleri burada görünecektir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
