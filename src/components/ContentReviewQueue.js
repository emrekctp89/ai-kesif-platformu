'use client';

import { useTransition } from 'react';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { Check, Eye, Undo2, X } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { adminReviewCreatorPost } from '@/app/actions/contentCreators';
import { plainTextFromMarkdown } from '@/lib/contentCreatorRules';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function snippetFromPost(post, max = 220) {
  const fromDesc = plainTextFromMarkdown(post?.description || '');
  if (fromDesc.length >= 40) return fromDesc.slice(0, max);
  const fromBody = plainTextFromMarkdown(post?.content || '');
  return fromBody.slice(0, max);
}

export function ContentReviewQueue({ posts }) {
  const t = useTranslations('AdminClient');
  const tc = useTranslations('ContentStudio');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function review(id, decision, form) {
    const formData = new FormData(form);
    formData.set('id', id);
    formData.set('decision', decision);
    startTransition(async () => {
      const result = await adminReviewCreatorPost(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success);
        router.refresh();
      }
    });
  }

  if (!posts?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t('contentReviewEmpty')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const authorLabel =
          post.author?.username ||
          post.author?.email ||
          post.profiles?.username ||
          post.profiles?.email ||
          post.author_id?.slice?.(0, 8) ||
          '—';
        const typeLabel =
          post.type === 'Rehber'
            ? tc('typeGuide')
            : post.type === 'Yazı'
              ? tc('typePost')
              : post.type;
        const snippet = snippetFromPost(post);
        const bodyLen = plainTextFromMarkdown(post?.content || '').length;
        const toolCount = Array.isArray(post.post_tools)
          ? post.post_tools.length
          : Array.isArray(post.relatedTools)
            ? post.relatedTools.length
            : 0;
        return (
          <Card key={post.id} className="glass-panel">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start gap-3">
                {post.featured_image_url ? (
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.featured_image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-[10px] text-muted-foreground">
                    {t('contentReviewNoCover')}
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{post.title}</CardTitle>
                    <Badge variant="secondary">{typeLabel}</Badge>
                    <Badge variant="outline">{t('contentReviewStatus')}</Badge>
                    {toolCount > 0 ? (
                      <Badge variant="outline">
                        {t('contentReviewTools', { count: toolCount })}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('contentReviewAuthor', { name: authorLabel })}
                    {post.submitted_at ? ` · ${new Date(post.submitted_at).toLocaleString()}` : ''}
                    {bodyLen > 0 ? ` · ${t('contentReviewChars', { count: bodyLen })}` : ''}
                  </p>
                  {snippet ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{snippet}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('contentReviewNoSnippet')}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
                onSubmit={(e) => e.preventDefault()}
              >
                <Input
                  name="review_note"
                  placeholder={t('contentReviewNotePlaceholder')}
                  className="min-w-0 flex-1"
                  disabled={isPending}
                />
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/icerik/${post.id}/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t('contentReviewPreview')}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/posts/${post.id}/edit`}>{t('contentReviewEdit')}</Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={(e) => review(post.id, 'publish', e.currentTarget.form)}
                >
                  <Check className="mr-1 h-4 w-4" />
                  {t('contentReviewPublish')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={(e) => review(post.id, 'return_draft', e.currentTarget.form)}
                >
                  <Undo2 className="mr-1 h-4 w-4" />
                  {t('contentReviewReturnDraft')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={(e) => review(post.id, 'reject', e.currentTarget.form)}
                >
                  <X className="mr-1 h-4 w-4" />
                  {t('contentReviewReject')}
                </Button>
              </form>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
