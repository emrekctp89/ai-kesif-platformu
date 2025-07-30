import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { AdminMenu } from './AdminMenu';
import { getNotifications } from '@/app/actions';
import { HeaderNav } from './HeaderNav';
import { Bot } from 'lucide-react';

// Toplam okunmamış mesaj sayısını çeken fonksiyon
async function getTotalUnreadMessages(userId) {
    if (!userId) return 0;
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_total_unread_count', { p_user_id: userId });
    if (error) {
        console.error("Toplam okunmamış mesaj sayısı çekilirken hata:", error);
        return 0;
    }
    return data;
}

// Bu, artık sadece veri çeken, sadeleşmiş bir "Server Component"tir.
export default async function Header() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user && user.email === process.env.ADMIN_EMAIL;

  // Gerekli tüm verileri sunucuda çekiyoruz
  const [profile, notificationsResult, totalUnreadMessages] = await Promise.all([
    user ? supabase.from('profiles').select('username, avatar_url, stripe_price_id').eq('id', user.id).single() : Promise.resolve({ data: null }),
    user ? getNotifications() : Promise.resolve({ notifications: [], unreadCount: 0 }),
    getTotalUnreadMessages(user?.id)
  ]);
  
  // DEĞİŞİKLİK: Adminler de artık her zaman "Pro" kullanıcı sayılır.
  const isProUser = !!profile?.data?.stripe_price_id || isAdmin;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center">
        
        {isAdmin && <AdminMenu />}
        
        <Link href="/kesfet" className="mr-6 flex items-center space-x-2">
          <Bot className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">AI Keşif</span>
        </Link>
        
        {/* Tüm bu verileri, interaktif mantığı yönetecek olan Client Component'e aktarıyoruz. */}
        <HeaderNav
            user={user}
            isAdmin={isAdmin}
            isProUser={isProUser}
            notifications={notificationsResult.notifications}
            unreadCount={notificationsResult.unreadCount}
            totalUnreadMessages={totalUnreadMessages}
            profile={profile?.data}
        />
      </div>
    </header>
  );
}
