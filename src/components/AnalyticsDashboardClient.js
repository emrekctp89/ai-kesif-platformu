'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Wrench, AlertTriangle, TrendingUp, Key } from 'lucide-react';
import dynamic from 'next/dynamic';

const AnalyticsLineChart = dynamic(() => import('./AnalyticsLineChart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
      Grafik yükleniyor...
    </div>
  ),
});
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AnalyticsDashboardClient({ data }) {
  const { totalUsers, totalTools, totalReports, chartData, totalApiKeys } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics & İzleme</h1>
          <p className="text-muted-foreground">Platformun genel istatistikleri ve durumu</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Sisteme kayıtlı üye sayısı</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Araç</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTools}</div>
            <p className="text-xs text-muted-foreground">Onaylı/onaysız tüm araçlar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kırık Link Raporları</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReports}</div>
            <p className="text-xs text-muted-foreground">
              Kullanıcılar tarafından bildirilen linkler
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Site Trafiği</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Vercel</div>
            <p className="text-xs text-muted-foreground">
              Trafik Vercel Analytics üzerinden takip ediliyor
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Anahtarları</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApiKeys}</div>
            <p className="text-xs text-muted-foreground">
              Geliştiriciler tarafından üretilen API Key sayısı
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4 mt-6">
        <CardHeader>
          <CardTitle>Son 30 Günlük Araç Ekleme Grafiği</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <AnalyticsLineChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
