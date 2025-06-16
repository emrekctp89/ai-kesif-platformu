"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
// DEĞİŞİKLİK: Doğrudan 'recharts' kütüphanesinden import ediyoruz
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Sayı kartları için bir alt bileşen
const StatCard = ({ title, value, icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

// Ana Dashboard arayüz bileşeni
export function DashboardClient({ stats }) {
  if (!stats) {
    return (
      <p className="text-center text-muted-foreground">
        İstatistikler yüklenemedi.
      </p>
    );
  }

  // Grafik için veriyi formatlıyoruz
  const chartData = stats.category_distribution.map((item) => ({
    name: item.category_name.slice(0, 3), // İsimleri kısaltıyoruz
    total: item.tool_count,
  }));

  return (
    <div className="space-y-8">
      {/* Üst Kısımdaki Sayı Kartları */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Toplam Kullanıcı" value={stats.total_users} />
        <StatCard title="Onaylanmış Araçlar" value={stats.total_tools} />
        <StatCard title="Toplam Yorum" value={stats.total_comments} />
        <StatCard title="Toplam Favori" value={stats.total_favorites} />
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        {/* Sol Taraf: Kategori Dağılım Grafiği */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Kategoriye Göre Araç Dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {/* DEĞİŞİKLİK: Grafiği doğrudan recharts ile oluşturuyoruz */}
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sağ Taraf: En Yüksek Puanlı Araçlar */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>En Yüksek Puanlı Araçlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.top_rated_tools.map((tool, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex-1 space-y-1">
                    <Link
                      href={`/tool/${tool.slug}`}
                      className="text-sm font-medium leading-none hover:underline"
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
