import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import { AdminPageClient } from '@/components/AdminPageClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TrendingUp, Database } from 'lucide-react';
import { sortCategoriesByCanonicalOrder } from '@/lib/categoryConfig';

export const metadata = {
  title: 'Operasyon Merkezi | AI Keşif Platformu',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

/**
 * Admin data must use the service-role client.
 * User-scoped RLS can hide tools/posts from the logged-in admin session
 * and nested joins (e.g. tool_variants) can fail entirely → empty UI.
 */
async function getAdminData() {
  const supabaseAdmin = createAdminClient();

  const toolsSelectWithVariants = `
    *,
    categories(name, slug),
    tool_tags(tags(id, name)),
    tool_variants(*)
  `;
  const toolsSelectBase = `
    *,
    categories(name, slug),
    tool_tags(tags(id, name))
  `;

  async function loadTools(isApproved) {
    const ascending = !isApproved; // pending: oldest first; approved: newest first

    const primary = await supabaseAdmin
      .from('tools')
      .select(toolsSelectWithVariants)
      .eq('is_approved', isApproved)
      .order('created_at', { ascending });

    if (!primary.error) {
      return (primary.data || []).map((tool) => ({
        ...tool,
        tool_variants: tool.tool_variants || [],
      }));
    }

    console.error(
      `[admin] tools(is_approved=${isApproved}) with variants failed:`,
      primary.error.message
    );

    // Fallback without variants so the panel still loads
    const fallback = await supabaseAdmin
      .from('tools')
      .select(toolsSelectBase)
      .eq('is_approved', isApproved)
      .order('created_at', { ascending });

    if (fallback.error) {
      console.error(
        `[admin] tools(is_approved=${isApproved}) fallback failed:`,
        fallback.error.message
      );
      return [];
    }

    return (fallback.data || []).map((tool) => ({
      ...tool,
      tool_variants: [],
    }));
  }

  const [
    unapprovedTools,
    approvedTools,
    unapprovedShowcaseResult,
    categoriesResult,
    tagsResult,
    postsResult,
    challengesResult,
    reportedLinksResult,
    adminAlertsResult,
  ] = await Promise.all([
    loadTools(false),
    loadTools(true),
    supabaseAdmin
      .from('showcase_items')
      .select(`*, profiles(email)`)
      .eq('is_approved', false)
      .order('created_at'),
    supabaseAdmin.from('categories').select('*').order('name'),
    supabaseAdmin.from('tags').select('*').order('name'),
    supabaseAdmin
      .from('posts')
      .select('id, title, slug, status, type')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('challenges').select('*').order('created_at', { ascending: false }),
    supabaseAdmin
      .from('tool_link_reports')
      .select('*, tools(id, name, slug, link)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('admin_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (unapprovedShowcaseResult.error) {
    console.error('[admin] showcase:', unapprovedShowcaseResult.error.message);
  }
  if (categoriesResult.error) {
    console.error('[admin] categories:', categoriesResult.error.message);
  }
  if (tagsResult.error) {
    console.error('[admin] tags:', tagsResult.error.message);
  }
  if (postsResult.error) {
    console.error('[admin] posts:', postsResult.error.message);
  }
  if (challengesResult.error) {
    console.error('[admin] challenges:', challengesResult.error.message);
  }
  if (reportedLinksResult.error) {
    console.error('[admin] link reports:', reportedLinksResult.error.message);
  }
  if (adminAlertsResult.error) {
    console.error('[admin] alerts:', adminAlertsResult.error.message);
  }

  const normalizedApprovedTools = (approvedTools || []).map((tool) => ({
    ...tool,
    category_name: tool.category_name || tool.categories?.name || null,
    category_slug: tool.category_slug || tool.categories?.slug || null,
    tool_variants: tool.tool_variants || [],
  }));

  const normalizedUnapprovedTools = (unapprovedTools || []).map((tool) => ({
    ...tool,
    category_name: tool.category_name || tool.categories?.name || null,
    category_slug: tool.category_slug || tool.categories?.slug || null,
    tool_variants: tool.tool_variants || [],
  }));

  return {
    unapprovedTools: normalizedUnapprovedTools,
    unapprovedShowcaseItems: unapprovedShowcaseResult.data || [],
    approvedTools: normalizedApprovedTools,
    categories: sortCategoriesByCanonicalOrder(categoriesResult.data || []),
    allTags: tagsResult.data || [],
    allPosts: postsResult.data || [],
    challenges: challengesResult.data || [],
    reportedLinks: reportedLinksResult.data || [],
    adminAlerts: adminAlertsResult.data || [],
  };
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/login');

  let adminData;
  try {
    adminData = await getAdminData();
  } catch (error) {
    console.error('[admin] getAdminData failed:', error);
    adminData = {
      unapprovedTools: [],
      unapprovedShowcaseItems: [],
      approvedTools: [],
      categories: [],
      allTags: [],
      allPosts: [],
      challenges: [],
      reportedLinks: [],
      adminAlerts: [],
    };
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Operasyon Merkezi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Onaylı araç: {adminData.approvedTools.length} · Bekleyen:{' '}
            {adminData.unapprovedTools.length} · Kategori: {adminData.categories.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/bulk-import">
            <Button variant="outline" className="gap-2">
              <Database className="h-4 w-4" />
              Toplu İçe Aktarım
            </Button>
          </Link>
          <Link href="/admin/analytics">
            <Button variant="outline" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics & İzleme
            </Button>
          </Link>
        </div>
      </div>
      <AdminPageClient data={adminData} />
    </div>
  );
}
