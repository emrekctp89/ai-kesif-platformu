import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, BookOpen, Eye, FilePenLine } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createAdminClient } from '@/utils/supabase/admin';
import { generatePageMetadata } from '@/utils/seo';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ContentStudio' });
  return generatePageMetadata({
    title: t('previewMetaTitle'),
    description: t('previewMetaDescription'),
    path: locale === 'en' ? `/en/icerik` : '/icerik',
    noindex: true,
  });
}

export default async function CreatorPreviewPostPage({ params }) {
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

  const { data: post, error } = await admin.from('posts').select('*').eq('id', id).maybeSingle();
  if (error || !post) notFound();
  if (!isAdmin && post.author_id !== user.id) redirect('/icerik');

  const isGuide = post.type === 'Rehber';
  const statusLabels = {
    Taslak: t('statDraft'),
    İncelemede: t('statReview'),
    Yayınlandı: t('statPublished'),
    Reddedildi: t('statRejected'),
  };
  const typeDisplay = isGuide ? t('typeGuide') : post.type === 'Yazı' ? t('typePost') : post.type;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/icerik">
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('backToStudio')}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-semibold">
              <Eye className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {t('previewBadge')}
            </Badge>
            <Badge variant="outline">{statusLabels[post.status] || post.status}</Badge>
            <Badge variant={isGuide ? 'default' : 'outline'}>
              {isGuide ? (
                <>
                  <BookOpen className="mr-1 h-3 w-3" aria-hidden="true" />
                  {typeDisplay}
                </>
              ) : (
                typeDisplay
              )}
            </Badge>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{post.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('previewHint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/icerik/${post.id}/edit`}>
              <FilePenLine className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('edit')}
            </Link>
          </Button>
          {post.status === 'Yayınlandı' && post.slug ? (
            <Button asChild size="sm">
              <Link href={`/blog/${post.slug}`}>{t('viewLive')}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
        {t('previewPrivateNote')}
      </div>

      {post.description ? (
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          {post.description}
        </p>
      ) : null}

      <article className="prose prose-lg max-w-none rounded-3xl border border-border/50 bg-card/40 p-6 dark:prose-invert sm:p-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ node, ...props }) => (
              <a className="font-medium underline-offset-4 hover:underline" {...props} />
            ),
          }}
        >
          {post.content || t('previewEmptyContent')}
        </ReactMarkdown>
      </article>
    </div>
  );
}
