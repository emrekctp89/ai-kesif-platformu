import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { AdminPageClient } from '@/components/AdminPageClient';

// Tüm verileri tek bir yerden çeken fonksiyon
async function getAdminData() {
    const supabase = createClient();
    const [
        { data: unapprovedTools },
        { data: unapprovedShowcaseItems },
        { data: approvedTools },
        { data: categories },
        { data: allTags },
        { data: allPosts },
        { data: challenges }
    ] = await Promise.all([
        supabase.from("tools").select("*").eq("is_approved", false).order("created_at"),
        supabase.from('showcase_items').select(`*, profiles(email)`).eq('is_approved', false).order('created_at'),
        // DÜZELTME: Onaylanmış araçları çeken RPC'yi çağırıyoruz
        supabase.rpc('get_admin_approved_tools'), 
        supabase.from("categories").select("*").order("name"),
        supabase.from("tags").select("*").order("name"),
        supabase.from("posts").select("id, title, slug, status, type").order("created_at", { ascending: false }),
        supabase.from('challenges').select('*').order('created_at', { ascending: false })
    ]);

    return { 
        unapprovedTools: unapprovedTools || [],
        unapprovedShowcaseItems: unapprovedShowcaseItems || [],
        approvedTools: approvedTools || [],
        categories: categories || [],
        allTags: allTags || [],
        allPosts: allPosts || [],
        challenges: challenges || []
    };
}

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/');

  const adminData = await getAdminData();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-foreground mb-8">Operasyon Merkezi</h1>
        <AdminPageClient data={adminData} />
    </div>
  );
}
