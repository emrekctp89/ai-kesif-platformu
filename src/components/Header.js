import logger from '@/utils/logger';
import { Link } from '@/i18n/routing';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { AdminMenu } from './AdminMenu';
import { getNotifications } from '@/app/actions';
import { HeaderNav } from './HeaderNav';
import { FutureAiGlyph } from './FutureAiGlyph';
import { safeGetUser } from '@/utils/supabase/auth-session';

// Toplam okunmamış mesaj sayısını çeken fonksiyon
async function getTotalUnreadMessages(supabase, userId) {
  if (!userId) return 0;
  const { data, error } = await supabase.rpc('get_total_unread_count', { p_user_id: userId });
  if (error) {
    logger.error('Toplam okunmamış mesaj sayısı çekilirken hata:', error);
    return 0;
  }
  return data;
}

// Bu, artık sadece veri çeken, sadeleşmiş bir "Server Component"tir.
export default async function Header() {
  const supabase = await createClient(await cookies());
  const { user } = await safeGetUser(supabase);
  const isAdmin = user && user.email === process.env.ADMIN_EMAIL;

  // Gerekli tüm verileri sunucuda çekiyoruz
  const [profileResult, notificationsResult, totalUnreadMessages] = await Promise.all([
    user
      ? supabase
          .from('profiles')
          .select('username, avatar_url, stripe_price_id, is_content_creator')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    user ? getNotifications() : Promise.resolve({ notifications: [], unreadCount: 0 }),
    getTotalUnreadMessages(supabase, user?.id),
  ]);

  // Fallback if migration not applied yet (column missing).
  let profile = profileResult?.data || null;
  if (user && profileResult?.error) {
    const fallback = await supabase
      .from('profiles')
      .select('username, avatar_url, stripe_price_id')
      .eq('id', user.id)
      .single();
    profile = fallback.data ? { ...fallback.data, is_content_creator: false } : null;
  }

  // DEĞİŞİKLİK: Adminler de artık her zaman "Pro" kullanıcı sayılır.
  const isProUser = !!profile?.stripe_price_id || isAdmin;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center px-4 md:px-6">
        {isAdmin && <AdminMenu />}

        <Link
          href="/"
          aria-label="AI Keşif ana sayfa"
          className="mr-3 flex shrink-0 items-center space-x-2 md:mr-6"
        >
          <FutureAiGlyph className="h-7 w-7" />
          <span className="text-lg font-bold tracking-tight sm:text-xl">AI Keşif</span>
        </Link>

        {/* Tüm bu verileri, interaktif mantığı yönetecek olan Client Component'e aktarıyoruz. */}
        <HeaderNav
          user={user}
          isAdmin={isAdmin}
          isProUser={isProUser}
          notifications={notificationsResult.notifications}
          unreadCount={notificationsResult.unreadCount}
          totalUnreadMessages={totalUnreadMessages}
          profile={profile}
        />
      </div>
    </header>
  );
}
