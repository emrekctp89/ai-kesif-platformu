import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// DEĞİŞİKLİK: Bu fonksiyon artık bizim akıllı RPC fonksiyonumuzu çağırıyor.
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
  const activeConversationId = params.conversationId;

  return (
    <div className="container mx-auto h-[calc(100vh-4rem)] border-t">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-full">
        {/* Sol Taraf: Sohbet Listesi */}
        <aside className="md:col-span-1 border-r h-full overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Sohbetler</h2>
            <div className="space-y-1">
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
        <main className="md:col-span-2 lg:col-span-3 h-full">{children}</main>
      </div>
    </div>
  );
}
