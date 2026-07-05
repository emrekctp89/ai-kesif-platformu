import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { AnalyticsDashboardClient } from '@/components/AnalyticsDashboardClient';

export const metadata = {
  title: 'Analytics | Operasyon Merkezi',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AnalyticsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/login');

  // Fetch analytical data
  // Using Promise.all to fetch concurrently
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
    // Fetch last 30 days of tools
    supabase
      .from('tools')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at'),
  ]);

  // Process data for charts
  const submissionsByDate = (toolSubmissionsOverTime || []).reduce((acc, tool) => {
    const date = new Date(tool.created_at).toLocaleDateString('tr-TR');
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
      <AnalyticsDashboardClient data={data} />
    </div>
  );
}
