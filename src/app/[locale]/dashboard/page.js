import { createClient } from '@/utils/supabase/server';
// DEĞİŞİKLİK: "Süper Admin" istemcisini import ediyoruz
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/DashboardClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserManagementTable } from '@/components/UserManagementTable';
import { AiBriefingCard } from '@/components/AiBriefingCard';

// DEĞİŞİKLİK: Bu fonksiyonlar artık "Süper Admin" yetkileriyle çalışacak
async function getDashboardData() {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.rpc('get_dashboard_stats');
  if (error) {
    console.error('Dashboard verileri çekilirken hata:', error);
    return null;
  }
  return data;
}

async function getAllUsersData() {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.rpc('get_all_user_details');
  if (error) {
    console.error('Kullanıcı detayları çekilirken hata:', error);
    return [];
  }
  return data;
}

async function getLinkHealthStats() {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from('tools')
    .select('id, link_check_status, link_checked_at')
    .eq('is_approved', true);

  if (error) {
    console.error('Link health verileri çekilirken hata:', error);
    return null;
  }

  const staleBefore = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const tools = data || [];

  return {
    total: tools.length,
    valid: tools.filter((tool) => tool.link_check_status === 'valid').length,
    invalid: tools.filter((tool) => tool.link_check_status === 'invalid').length,
    review: tools.filter((tool) => tool.link_check_status === 'review').length,
    unchecked: tools.filter((tool) => !tool.link_checked_at).length,
    stale: tools.filter(
      (tool) => tool.link_checked_at && new Date(tool.link_checked_at).getTime() < staleBefore
    ).length,
  };
}

async function getLatestBriefing() {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from('ai_briefings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // Hata olması normal, henüz brifing olmayabilir.
    return null;
  }
  return data;
}

export const metadata = {
  title: 'Admin Dashboard | AI Keşif Platformu',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/');
  }

  const [stats, allUsers, latestBriefing, linkHealthStats] = await Promise.all([
    getDashboardData(),
    getAllUsersData(),
    getLatestBriefing(),
    getLinkHealthStats(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <header className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-lg glass-panel sm:p-8">
        <div className="relative z-10">
          <p className="brand-chip mb-2 inline-flex rounded-full px-3 py-1 text-xs font-bold">
            Yönetim
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Admin Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Platform istatistikleri, AI brifing, link sağlığı ve kullanıcı yönetimi.
          </p>
        </div>
      </header>

      <AiBriefingCard briefing={latestBriefing} />

      <DashboardClient stats={stats} linkHealthStats={linkHealthStats} />

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>Kullanıcı Yönetimi</CardTitle>
          <CardDescription>
            Platformdaki tüm kullanıcıları ve aktivitelerini buradan yönetebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable users={allUsers} adminId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
