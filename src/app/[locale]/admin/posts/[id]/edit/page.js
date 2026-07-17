import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, FilePenLine } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { PostEditor } from '@/components/PostEditor';
import { Button } from '@/components/ui/button';
import { sortCategoriesByCanonicalOrder } from '@/lib/categoryConfig';

async function getPost(id) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('posts')
    .select(`*, post_tools(tools(id, name)), post_tags(tags(id, name))`)
    .eq('id', id)
    .single();
  if (error || !data) notFound();
  return data;
}

async function getAllTools() {
  const supabase = await createClient(await cookies());
  const { data } = await supabase
    .from('tools')
    .select('id, name')
    .eq('is_approved', true)
    .order('name');
  return data || [];
}

async function getAllTags() {
  const supabase = await createClient(await cookies());
  const { data } = await supabase.from('tags').select('*').order('name', { ascending: true });
  return data || [];
}

async function getAllCategories() {
  const supabase = await createClient(await cookies());
  const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
  return sortCategoriesByCanonicalOrder(data || []);
}

export default async function EditPostPage(props) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'AdminOps' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/');

  const [post, allTools, allTags, allCategories] = await Promise.all([
    getPost(params.id),
    getAllTools(),
    getAllTags(),
    getAllCategories(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-3 py-6 sm:px-4 sm:py-8">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
              <FilePenLine className="h-4 w-4" aria-hidden="true" />
              {t('editPostChip')}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{t('editPostTitle')}</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {t('editPostSubtitle')}
              {post.title ? (
                <>
                  {' '}
                  <span className="font-medium text-foreground">&quot;{post.title}&quot;</span>
                </>
              ) : null}
            </p>
          </div>
          <Button asChild variant="outline" className="glass-button min-h-10 shrink-0 gap-2">
            <Link href="/admin" prefetch={false}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('backToAdmin')}
            </Link>
          </Button>
        </div>
      </section>

      <div className="rounded-3xl border border-border/50 bg-card/40 p-4 glass-panel sm:p-6">
        <PostEditor
          post={post}
          allTools={allTools}
          allTags={allTags}
          allCategories={allCategories}
        />
      </div>
    </div>
  );
}
