import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Star, Image as ImageIcon } from "lucide-react";

// Veritabanındaki RPC fonksiyonunu çağıran fonksiyon
async function getActivityFeedData() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_community_activity_feed");

  if (error) {
    console.error("Aktivite akışı çekilirken hata:", error);
    return [];
  }
  return data;
}

// Her bir olay türü için farklı bir kart tasarımı
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
        <p className="text-xs italic text-muted-foreground mt-1">
          "{event.details.comment_content}"
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
      <img
        src={event.details.item_image_url}
        alt={event.details.item_title}
        className="w-12 h-12 object-cover rounded-md ml-auto"
      />
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
          için yeni bir prompt paylaştı: "{event.details.prompt_title}"
        </p>
        <time className="text-xs text-muted-foreground">
          {new Date(event.event_time).toLocaleDateString("tr-TR")}
        </time>
      </div>
    </CardContent>
  ),
};

// Ana Aktivite Akışı Bileşeni
export async function ActivityFeed() {
  const feedItems = await getActivityFeedData();

  if (!feedItems || feedItems.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Topluluk Akışı</h2>
        <p className="text-muted-foreground">
          Platformda henüz bir aktivite yok. İlk katkıyı sen yap!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-center">Topluluk Akışı</h2>
      <div className="space-y-4">
        {feedItems.map((event, index) => {
          const EventComponent = eventComponents[event.event_type];
          return EventComponent ? (
            <Card
              key={`${event.event_type}-${index}`}
              className="transition-all hover:shadow-md"
            >
              <EventComponent event={event} />
            </Card>
          ) : null;
        })}
      </div>
    </div>
  );
}
