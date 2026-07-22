import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, FilePenLine } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { CreatorPostEditor } from '@/components/CreatorPostEditor';
import { Button } from '@/components/ui/button';
import { createAdminClient } from '@/utils/supabase/admin';

export default async function CreatorEditPostPage({ params }) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'ContentStudio' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  const admin = createAdminClient();

  if (!isAdmin) {
    const { data: profile } = await admin
      .from('profiles')
      .select('is_content_creator')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.is_content_creator) redirect('/icerik');
  }

  const [{ data: post, error }, { data: categories }, { data: tags }, { data: postTags }] =
    await Promise.all([
      admin.from('posts').select('*').eq('id', id).maybeSingle(),
      admin.from('categories').select('id, name').order('name', { ascending: true }),
      admin.from('tags').select('id, name').order('name', { ascending: true }),
      admin.from('post_tags').select('tag_id').eq('post_id', id),
    ]);

  if (error || !post) notFound();
  if (!isAdmin && post.author_id !== user.id) redirect('/icerik');

  const selectedTagIds = (postTags || []).map((row) => row.tag_id).filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/icerik">
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('backToStudio')}
            </Link>
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            <FilePenLine className="h-6 w-6 text-primary" aria-hidden="true" />
            {t('editTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{post.title}</p>
        </div>
      </div>
      <CreatorPostEditor
        post={post}
        categories={categories || []}
        tags={tags || []}
        selectedTagIds={selectedTagIds}
      />
    </div>
  );
}
