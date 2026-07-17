import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

// Kullanıcının sohbetlerini, okunmamış mesaj sayılarıyla birlikte çeken fonksiyon
async function getConversations(userId) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_user_conversations', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Sohbetler çekilirken hata:', error);
    return [];
  }
  return data;
}

export default async function MessagesLayout(props) {
  const params = await props.params;

  const { children } = props;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?message=${encodeURIComponent('Mesajları görmek için giriş yapmalısınız.')}`);
  }

  const conversations = await getConversations(user.id);
  // URL'den aktif sohbetin ID'sini alıyoruz
  const activeConversationId = params.conversationId;

  return (
    <div className="-m-4 flex h-[calc(100vh-5.6rem)] border-t border-border/60 md:-m-6">
      <aside
        className={cn(
          'h-full w-full flex-col border-r border-border/60 bg-background',
          'md:flex md:w-[300px] lg:w-[350px]',
          activeConversationId ? 'hidden md:flex' : 'flex'
        )}
      >
        <div className="border-b border-border/60 bg-muted/20 p-4">
          <h2 className="text-xl font-extrabold tracking-tight">Sohbetler</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{conversations.length} sohbet</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Henüz sohbet yok. Bir profil üzerinden mesaj başlatabilirsin.
            </p>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((convo) => {
                const otherUser = {
                  id: convo.other_participant_id,
                  username: convo.other_participant_username,
                  avatar_url: convo.other_participant_avatar_url,
                  email: convo.other_participant_email,
                };
                const unreadCount = convo.unread_count;
                const display =
                  otherUser.username ||
                  (otherUser.email ? String(otherUser.email).split('@')[0] : 'Kullanıcı');
                const fallback = display.substring(0, 2).toUpperCase() || '??';
                const isActive = String(activeConversationId) === String(convo.conversation_id);

                return (
                  <Link
                    key={convo.conversation_id}
                    href={`/mesajlar/${convo.conversation_id}`}
                    className={cn(
                      'flex items-center justify-between rounded-xl p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-muted/60'
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        {otherUser.avatar_url ? (
                          <AvatarImage src={otherUser.avatar_url} alt="" />
                        ) : null}
                        <AvatarFallback>{fallback}</AvatarFallback>
                      </Avatar>
                      <p className="truncate text-sm font-semibold">{display}</p>
                    </div>
                    {unreadCount > 0 ? (
                      <Badge className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                        {unreadCount}
                      </Badge>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </aside>
      <main
        className={cn(
          'h-full flex-1 flex-col bg-muted/10',
          activeConversationId ? 'flex' : 'hidden md:flex'
        )}
      >
        {children}
      </main>
    </div>
  );
}
