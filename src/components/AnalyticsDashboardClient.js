'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Users, Wrench, AlertTriangle, TrendingUp, Key, BarChart3 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AnalyticsLineChart = dynamic(() => import('./AnalyticsLineChart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
      …
    </div>
  ),
});

const defaultLabels = {
  title: 'Analytics',
  subtitle: '',
  chip: 'Metrics',
  back: 'Back',
  chartTitle: 'Tool submissions (last 30 days)',
  statUsers: 'Total users',
  statUsersHint: '',
  statTools: 'Total tools',
  statToolsHint: '',
  statReports: 'Broken link reports',
  statReportsHint: '',
  statTraffic: 'Site traffic',
  statTrafficValue: 'Vercel',
  statTrafficHint: '',
  statApiKeys: 'API keys',
  statApiKeysHint: '',
};

export function AnalyticsDashboardClient({ data, labels: labelsProp }) {
  const labels = { ...defaultLabels, ...labelsProp };
  const { totalUsers, totalTools, totalReports, chartData, totalApiKeys } = data;

  const stats = [
    {
      title: labels.statUsers,
      value: totalUsers,
      hint: labels.statUsersHint,
      icon: Users,
    },
    {
      title: labels.statTools,
      value: totalTools,
      hint: labels.statToolsHint,
      icon: Wrench,
    },
    {
      title: labels.statReports,
      value: totalReports,
      hint: labels.statReportsHint,
      icon: AlertTriangle,
    },
    {
      title: labels.statTraffic,
      value: labels.statTrafficValue,
      hint: labels.statTrafficHint,
      icon: TrendingUp,
    },
    {
      title: labels.statApiKeys,
      value: totalApiKeys,
      hint: labels.statApiKeysHint,
      icon: Key,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              {labels.chip}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{labels.title}</h1>
            {labels.subtitle ? (
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">{labels.subtitle}</p>
            ) : null}
          </div>
          <Button asChild variant="outline" className="glass-button min-h-10 shrink-0 gap-2">
            <Link href="/admin" prefetch={false}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {labels.back}
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map(({ title, value, hint, icon: Icon }) => (
          <Card key={title} className="glass-panel border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>{labels.chartTitle}</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <AnalyticsLineChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
