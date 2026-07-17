'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DashboardCategoryChart = dynamic(() => import('./DashboardCategoryChart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
      …
    </div>
  ),
});

const StatCard = ({ title, value }) => (
  <Card className="glass-panel border-border/50">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

function LinkHealthWidget({ stats, t }) {
  if (!stats) return null;

  const activeIssueCount = stats.invalid + stats.review;
  const freshnessIssueCount = stats.unchecked + stats.stale;

  return (
    <Card className="glass-panel border-border/50">
      <CardHeader>
        <CardTitle>{t('linkHealthTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{t('linkTotal')}</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-emerald-500/10 p-3">
            <p className="text-xs text-muted-foreground">{t('linkValid')}</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.valid}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-red-500/10 p-3">
            <p className="text-xs text-muted-foreground">{t('linkInvalid')}</p>
            <p className="text-2xl font-bold text-red-600">{stats.invalid}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-orange-500/10 p-3">
            <p className="text-xs text-muted-foreground">{t('linkReview')}</p>
            <p className="text-2xl font-bold text-orange-600">{stats.review}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-sky-500/10 p-3">
            <p className="text-xs text-muted-foreground">{t('linkStale')}</p>
            <p className="text-2xl font-bold text-sky-600">{freshnessIssueCount}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {activeIssueCount > 0
              ? t('linkIssuesActive', { count: activeIssueCount })
              : t('linkIssuesNone')}
            {freshnessIssueCount > 0
              ? t('linkFreshnessIssues', {
                  unchecked: stats.unchecked,
                  stale: stats.stale,
                })
              : t('linkFreshnessOk')}
          </p>
          <Link href="/admin" className="font-medium text-primary hover:underline" prefetch={false}>
            {t('linkGoAdmin')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardClient({ stats, linkHealthStats }) {
  const t = useTranslations('AdminDashboard');

  if (!stats) {
    return <p className="text-center text-muted-foreground">{t('statsLoadError')}</p>;
  }

  const chartData = (stats.category_distribution || []).map((item) => ({
    name: String(item.category_name || '').slice(0, 3),
    total: item.tool_count,
  }));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('statUsers')} value={stats.total_users} />
        <StatCard title={t('statTools')} value={stats.total_tools} />
        <StatCard title={t('statComments')} value={stats.total_comments} />
        <StatCard title={t('statFavorites')} value={stats.total_favorites} />
      </div>

      <LinkHealthWidget stats={linkHealthStats} t={t} />

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <Card className="glass-panel border-border/50 lg:col-span-4">
          <CardHeader>
            <CardTitle>{t('categoryChartTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <DashboardCategoryChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/50 lg:col-span-3">
          <CardHeader>
            <CardTitle>{t('topRatedTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats.top_rated_tools || []).map((tool, index) => (
                <div key={tool.slug || index} className="flex items-center">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      href={`/tool/${tool.slug}`}
                      className="text-sm font-medium leading-none hover:underline"
                      prefetch={false}
                    >
                      {tool.name}
                    </Link>
                  </div>
                  <div className="ml-auto font-medium">
                    {Number(tool.average_rating).toFixed(1)} ★
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
