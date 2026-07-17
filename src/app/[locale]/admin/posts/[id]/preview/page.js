import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Eye } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';

async function getPostForPreview(id) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase.from('posts').select('*').eq('id', id).single();
  if (error || !data) notFound();
  return data;
}

export default async function PreviewPostPage(props) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'AdminOps' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/login');
  }

  const post = await getPostForPreview(params.id);

  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="brand-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
          <Eye className="h-4 w-4" aria-hidden="true" />
          {t('previewChip')}
        </div>
        <Button asChild variant="outline" size="sm" className="glass-button min-h-9 gap-2">
          <Link href={`/admin/posts/${params.id}/edit`} prefetch={false}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('editPostTitle')}
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-900 dark:text-amber-100">
        {t('previewBanner')}
      </div>

      <header className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {post.title}
          </h1>
          {post.description ? (
            <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
          ) : null}
        </div>
      </header>

      {post.featured_image_url ? (
        <div className="relative mb-2 aspect-video overflow-hidden rounded-xl border border-border/50">
          <Image
            src={post.featured_image_url}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      ) : null}

      <div className="prose prose-lg max-w-none rounded-3xl border border-border/50 bg-card/40 p-6 glass-panel dark:prose-invert sm:p-8">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
      </div>
    </article>
  );
}
