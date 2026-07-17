import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { FolderKanban } from 'lucide-react';

import { CollectionEditor } from '@/components/CollectionEditor';

async function getCollection(id, userId) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('collections')
    .select(
      `
            *,
            collection_tools ( tool_id, notes )
        `
    )
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    notFound();
  }
  return data;
}

async function getAllTools() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tools')
    .select('id, name')
    .eq('is_approved', true)
    .order('name', { ascending: true });

  if (error) {
    return [];
  }
  return data;
}

export default async function EditCollectionPage(props) {
  const params = await props.params;
  const t = await getTranslations('ProfileComponents');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [collection, allTools] = await Promise.all([
    getCollection(params.id, user.id),
    getAllTools(),
  ]);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-8 pb-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <FolderKanban className="h-4 w-4" aria-hidden="true" />
            {collection.title}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t('editCollectionTitle')}
          </h1>
        </div>
      </section>
      <CollectionEditor collection={collection} allTools={allTools} />
    </div>
  );
}
