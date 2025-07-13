import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/DashboardClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Yeni Kullanıcı Yönetim Tablosu bileşenini import ediyoruz
import { UserManagementTable } from "@/components/UserManagementTable";
import { AiBriefingCard } from "@/components/AiBriefingCard"; // Yeni bileşeni import ediyoruz

// Veritabanındaki RPC fonksiyonlarını çağıran fonksiyonlar
async function getDashboardData() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_dashboard_stats");
  if (error) {
    console.error("Dashboard verileri çekilirken hata:", error);
    return null;
  }
  return data;
}

// Tüm kullanıcı detaylarını çeken fonksiyon
async function getAllUsersData() {
  const supabase = createClient();
  // RPC ile özel admin fonksiyonumuzu çağırıyoruz
  const { data, error } = await supabase.rpc("get_all_user_details");
  if (error) {
    console.error("Kullanıcı detayları çekilirken hata:", error);
    return [];
  }
  return data;
}

export const metadata = {
  title: "Admin Dashboard | AI Keşif Platformu",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/");
  }

  // Hem genel istatistikleri hem de tüm kullanıcı listesini paralel olarak çekiyoruz
  const [stats, allUsers] = await Promise.all([
    getDashboardData(),
    getAllUsersData(),
  ]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>

      {/* YENİ: AI Brifing Kartı */}
      <AiBriefingCard />

      {/* İstatistikler Bölümü */}
      <DashboardClient stats={stats} />

      {/* Kullanıcı Yönetim Tablosu Bölümü */}
      <Card>
        <CardHeader>
          <CardTitle>Kullanıcı Yönetimi</CardTitle>
          <CardDescription>
            Platformdaki tüm kullanıcıları ve aktivitelerini buradan
            yönetebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Yeni bileşenimizi burada kullanıyoruz ve gerekli bilgileri iletiyoruz */}
          <UserManagementTable users={allUsers} adminId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
