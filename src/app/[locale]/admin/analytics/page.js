import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { AnalyticsDashboardClient } from '@/components/AnalyticsDashboardClient';
import { generatePageMetadata } from '@/utils/seo';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AdminOps' });
  return generatePageMetadata({
    title: t('analyticsMetaTitle'),
    description: t('analyticsSubtitle'),
    path: locale === 'en' ? '/en/admin/analytics' : '/admin/analytics',
    noindex: true,
  });
}

export default async function AnalyticsPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AdminOps' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/login');

  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';

  const [
    { count: totalUsers },
    { count: totalTools },
    { count: totalReports },
    { count: totalApiKeys },
    { data: toolSubmissionsOverTime },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('tools').select('*', { count: 'exact', head: true }),
    supabase.from('tool_link_reports').select('*', { count: 'exact', head: true }),
    supabase.from('api_keys').select('*', { count: 'exact', head: true }),
    supabase
      .from('tools')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at'),
  ]);

  const submissionsByDate = (toolSubmissionsOverTime || []).reduce((acc, tool) => {
    const date = new Date(tool.created_at).toLocaleDateString(dateLocale);
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(submissionsByDate).map(([date, count]) => ({
    date,
    count,
  }));

  const data = {
    totalUsers: totalUsers || 0,
    totalTools: totalTools || 0,
    totalReports: totalReports || 0,
    totalApiKeys: totalApiKeys || 0,
    chartData,
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-8">
      <AnalyticsDashboardClient
        data={data}
        labels={{
          title: t('analyticsTitle'),
          subtitle: t('analyticsSubtitle'),
          chip: t('analyticsChip'),
          back: t('backToAdmin'),
          chartLoading: t('chartLoading'),
          chartTitle: t('chartTitle'),
          statUsers: t('statUsers'),
          statUsersHint: t('statUsersHint'),
          statTools: t('statTools'),
          statToolsHint: t('statToolsHint'),
          statReports: t('statReports'),
          statReportsHint: t('statReportsHint'),
          statTraffic: t('statTraffic'),
          statTrafficValue: t('statTrafficValue'),
          statTrafficHint: t('statTrafficHint'),
          statApiKeys: t('statApiKeys'),
          statApiKeysHint: t('statApiKeysHint'),
        }}
      />
    </div>
  );
}
