import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { AdminPageClient } from "@/components/AdminPageClient";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
export const metadata = {
  title: "Operasyon Merkezi | AI Keşif Platformu",
  robots: {
    index: false,
    follow: false,
  },
};

// Tüm verileri tek bir yerden çeken fonksiyon
async function getAdminData() {
  const supabase = createClient();
  const supabaseAdmin = createAdminClient();
  const [
    { data: unapprovedTools },
    { data: unapprovedShowcaseItems },
    { data: approvedTools },
    { data: categories },
    { data: allTags },
    { data: allPosts },
    { data: challenges },
    { data: reportedLinks },
  ] = await Promise.all([
    supabase
      .from("tools")
      .select("*, categories(name), tool_tags(tags(id, name))")
      .eq("is_approved", false)
      .order("created_at"),
    supabase
      .from("showcase_items")
      .select(`*, profiles(email)`)
      .eq("is_approved", false)
      .order("created_at"),
    supabase
      .from("tools")
      .select(
        `
            *,
            categories(name, slug),
            tool_tags(tags(id, name))
          `,
      )
      .eq("is_approved", true)
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("name"),
    supabase.from("tags").select("*").order("name"),
    supabase
      .from("posts")
      .select("id, title, slug, status, type")
      .order("created_at", { ascending: false }),
    supabase
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("tool_link_reports")
      .select("*, tools(id, name, slug, link)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const normalizedApprovedTools = (approvedTools || []).map((tool) => ({
    ...tool,
    category_name: tool.category_name || tool.categories?.name || null,
    category_slug: tool.category_slug || tool.categories?.slug || null,
  }));

  return {
    unapprovedTools: unapprovedTools || [],
    unapprovedShowcaseItems: unapprovedShowcaseItems || [],
    approvedTools: normalizedApprovedTools,
    categories: categories || [],
    allTags: allTags || [],
    allPosts: allPosts || [],
    challenges: challenges || [],
    reportedLinks: reportedLinks || [],
  };
}

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // IP kısıtlaması kaldırıldı, sadece email kontrolü kalıyor
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/login");

  const adminData = await getAdminData();

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-foreground">
          Operasyon Merkezi
        </h1>
        <Link href="/admin/analytics">
          <Button variant="outline" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics & İzleme
          </Button>
        </Link>
      </div>
      <AdminPageClient data={adminData} />
    </div>
  );
}
