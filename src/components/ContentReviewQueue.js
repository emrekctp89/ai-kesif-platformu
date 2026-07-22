'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { adminReviewCreatorPost } from '@/app/actions/contentCreators';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
        return (
          <Card key={post.id} className="glass-panel">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{post.title}</CardTitle>
                <Badge variant="secondary">{typeLabel}</Badge>
                <Badge variant="outline">{t('contentReviewStatus')}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('contentReviewAuthor', { name: authorLabel })}
                {post.submitted_at ? ` · ${new Date(post.submitted_at).toLocaleString()}` : ''}
              </p>
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
