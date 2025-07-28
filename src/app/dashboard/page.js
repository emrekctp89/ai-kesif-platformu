import { createClient } from '@/utils/supabase/server';
// DEĞİŞİKLİK: "Süper Admin" istemcisini import ediyoruz
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/DashboardClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagementTable } from '@/components/UserManagementTable';
import { AiBriefingCard } from '@/components/AiBriefingCard';

// DEĞİŞİKLİK: Bu fonksiyonlar artık "Süper Admin" yetkileriyle çalışacak
async function getDashboardData() {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.rpc('get_dashboard_stats');
    if (error) { console.error("Dashboard verileri çekilirken hata:", error); return null; }
    return data;
}

async function getAllUsersData() {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.rpc('get_all_user_details');
    if (error) { console.error("Kullanıcı detayları çekilirken hata:", error); return []; }
    return data;
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
};

export default async function DashboardPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
        redirect('/');
    }

    const [stats, allUsers, latestBriefing] = await Promise.all([
        getDashboardData(),
        getAllUsersData(),
        getLatestBriefing()
    ]);

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            
            <AiBriefingCard briefing={latestBriefing} />

            <DashboardClient stats={stats} />

            <Card>
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
