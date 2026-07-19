import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { DashboardClient } from '@/components/DashboardClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserManagementTable } from '@/components/UserManagementTable';
import { CreatorApplicationsPanel } from '@/components/CreatorApplicationsPanel';
import { AiBriefingCard } from '@/components/AiBriefingCard';
import { getCreatorApplications } from '@/app/actions/contentCreators';
import { Badge } from '@/components/ui/badge';
import { generatePageMetadata } from '@/utils/seo';

// DEĞİŞİKLİK: Bu fonksiyonlar artık "Süper Admin" yetkileriyle çalışacak
async function getDashboardData() {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.rpc('get_dashboard_stats');
  if (error) {
    logger.error('Dashboard verileri çekilirken hata:', error);
    return null;
  }
  return data;
}

async function getAllUsersData() {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.rpc('get_all_user_details');
  if (error) {
    logger.error('Kullanıcı detayları çekilirken hata:', error);
    return [];
  }
  const users = data || [];
  const { data: creatorFlags, error: flagsError } = await supabaseAdmin
    .from('profiles')
    .select('id, is_content_creator');
  if (flagsError) {
    // Column may not exist until migration is applied.
    logger.error('İçerik üretici bayrakları okunamadı:', flagsError.message);
    return users.map((user) => ({ ...user, is_content_creator: false }));
  }
  const flagMap = new Map(
    (creatorFlags || []).map((row) => [row.id, Boolean(row.is_content_creator)])
  );
  return users.map((user) => ({
    ...user,
    is_content_creator: flagMap.get(user.id) || false,
  }));
}

async function getLinkHealthStats() {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from('tools')
    .select('id, link_check_status, link_checked_at')
    .eq('is_approved', true);

  if (error) {
    logger.error('Link health verileri çekilirken hata:', error);
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

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AdminDashboard' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('subtitle'),
    path: locale === 'en' ? '/en/dashboard' : '/dashboard',
    noindex: true,
  });
}

export default async function DashboardPage({ params }) {
  await params;
  const t = await getTranslations('AdminDashboard');
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/');
  }

  const [stats, allUsers, latestBriefing, linkHealthStats, creatorApplications] = await Promise.all(
    [
      getDashboardData(),
      getAllUsersData(),
      getLatestBriefing(),
      getLinkHealthStats(),
      getCreatorApplications(),
    ]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <header className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {t('subtitle')}
          </p>
        </div>
      </header>

      <AiBriefingCard briefing={latestBriefing} />

      <DashboardClient stats={stats} linkHealthStats={linkHealthStats} />

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            İçerik üretici başvuruları
            <Badge variant="secondary">{creatorApplications.length}</Badge>
          </CardTitle>
          <CardDescription>
            Üyelerden gelen üretici başvurularını onayla veya reddet. Onaylananlar /icerik
            stüdyosuna erişir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreatorApplicationsPanel applications={creatorApplications} />
        </CardContent>
      </Card>

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>{t('usersTitle')}</CardTitle>
          <CardDescription>{t('usersDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable users={allUsers} adminId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
