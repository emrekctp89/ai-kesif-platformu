import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Database, Shield } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { AdminPageClient } from '@/components/AdminPageClient';
import { Button } from '@/components/ui/button';
import { sortCategoriesByCanonicalOrder } from '@/lib/categoryConfig';
import { getCreatorApplications } from '@/app/actions/contentCreators';
import { generatePageMetadata } from '@/utils/seo';

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

    logger.error(
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
      logger.error(
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
      .select(
        'id, title, slug, status, type, description, content, featured_image_url, submitted_at, updated_at, published_at, author_id, review_note, post_tools(tool_id)'
      )
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
    logger.error('[admin] showcase:', unapprovedShowcaseResult.error.message);
  }
  if (categoriesResult.error) {
    logger.error('[admin] categories:', categoriesResult.error.message);
  }
  if (tagsResult.error) {
    logger.error('[admin] tags:', tagsResult.error.message);
  }
  if (postsResult.error) {
    logger.error('[admin] posts:', postsResult.error.message);
  }
  if (challengesResult.error) {
    logger.error('[admin] challenges:', challengesResult.error.message);
  }
  if (reportedLinksResult.error) {
    logger.error('[admin] link reports:', reportedLinksResult.error.message);
  }
  if (adminAlertsResult.error) {
    logger.error('[admin] alerts:', adminAlertsResult.error.message);
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
    allPosts: await (async () => {
      const posts = postsResult.data || [];
      const authorIds = [
        ...new Set(posts.map((p) => p.author_id).filter((id) => typeof id === 'string' && id)),
      ];
      if (!authorIds.length) return posts;
      const { data: authors } = await supabaseAdmin
        .from('profiles')
        .select('id, username, email')
        .in('id', authorIds);
      const map = new Map((authors || []).map((a) => [a.id, a]));
      return posts.map((post) => ({
        ...post,
        author: post.author_id ? map.get(post.author_id) || null : null,
      }));
    })(),
    challenges: challengesResult.data || [],
    reportedLinks: reportedLinksResult.data || [],
    adminAlerts: adminAlertsResult.data || [],
  };
}

async function loadCreatorApplicationsSafe() {
  try {
    return await getCreatorApplications();
  } catch (error) {
    logger.error('[admin] creator applications:', error);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AdminOps' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('title'),
    path: locale === 'en' ? '/en/admin' : '/admin',
    noindex: true,
  });
}

export default async function AdminPage({ params }) {
  await params;
  const t = await getTranslations('AdminOps');
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/login');

  let adminData;
  try {
    adminData = await getAdminData();
  } catch (error) {
    logger.error('[admin] getAdminData failed:', error);
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

  const creatorApplications = await loadCreatorApplicationsSafe();
  adminData = { ...adminData, creatorApplications };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-3 py-5 sm:px-4 sm:py-8">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
              <Shield className="h-4 w-4" aria-hidden="true" />
              {t('heroChip')}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('title')}</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {t('subtitle', {
                approved: adminData.approvedTools.length,
                pending: adminData.unapprovedTools.length,
                categories: adminData.categories.length,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="glass-button min-h-10 gap-2">
              <Link href="/admin/bulk-import" prefetch={false}>
                <Database className="h-4 w-4" aria-hidden="true" />
                {t('bulkImport')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="glass-button min-h-10 gap-2">
              <Link href="/admin/analytics" prefetch={false}>
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                {t('analytics')}
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <AdminPageClient data={adminData} />
    </div>
  );
}
