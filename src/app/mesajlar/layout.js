import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Kullanıcının sohbetlerini, okunmamış mesaj sayılarıyla birlikte çeken fonksiyon
async function getConversations(userId) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_user_conversations", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Sohbetler çekilirken hata:", error);
    return [];
  }
  return data;
}

export default async function MessagesLayout({ children, params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Mesajları görmek için giriş yapmalısınız.");
  }

  const conversations = await getConversations(user.id);
  // URL'den aktif sohbetin ID'sini alıyoruz
  const activeConversationId = params.conversationId;

  return (
    // DEĞİŞİKLİK: Bu ana kapsayıcı, ana layout'un padding'ini sıfırlayarak
    // tüm alanı kaplayan bir flex container'a dönüşüyor.
    <div className="flex h-[calc(100vh-5.6rem)] -m-4 md:-m-6 border-t">
      {/* Sol Taraf: Sohbet Listesi */}
      <aside
        className={cn(
          "w-full border-r flex-col h-full bg-background",
          "md:w-[300px] lg:w-[350px] md:flex", // Masaüstünde her zaman görünür
          activeConversationId ? "hidden md:flex" : "flex" // Bir sohbet seçiliyse mobilde gizle
        )}
      >
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Sohbetler</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1 p-2">
            {conversations.map((convo) => {
              const otherUser = {
                id: convo.other_participant_id,
                username: convo.other_participant_username,
                avatar_url: convo.other_participant_avatar_url,
                email: convo.other_participant_email,
              };
              const unreadCount = convo.unread_count;
              const fallback =
                (otherUser.username || otherUser.email)
                  ?.substring(0, 2)
                  .toUpperCase() || "??";

              return (
                <Link
                  key={convo.conversation_id}
                  href={`/mesajlar/${convo.conversation_id}`}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg transition-colors",
                    activeConversationId == convo.conversation_id
                      ? "bg-muted"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={otherUser.avatar_url} />
                      <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-sm truncate">
                      {otherUser.username || otherUser.email}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <Badge className="h-6 w-6 flex items-center justify-center shrink-0">
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Sağ Taraf: Aktif Sohbet Penceresi */}
      <main
        className={cn(
          "flex-1 flex-col h-full",
          activeConversationId ? "flex" : "hidden md:flex" // Bir sohbet seçili değilse mobilde gizle
        )}
      >
        {children}
      </main>
    </div>
  );
}
