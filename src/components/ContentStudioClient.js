'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { FilePenLine, Plus } from 'lucide-react';
import { createCreatorPost } from '@/app/actions/contentCreators';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function statusVariant(status) {
  if (status === 'Yayınlandı') return 'default';
  if (status === 'İncelemede') return 'secondary';
  if (status === 'Reddedildi') return 'destructive';
  return 'outline';
}

export function ContentStudioClient({ posts }) {
  const t = useTranslations('ContentStudio');
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState('Yazı');

  return (
    <div className="space-y-8">
      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" aria-hidden="true" />
            {t('newDraftTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              formData.set('type', type);
              startTransition(async () => {
                try {
                  const result = await createCreatorPost(formData);
                  if (result?.error) toast.error(result.error);
                } catch (err) {
                  // redirect() throws; ignore next navigation signal
                  if (err && typeof err === 'object' && 'digest' in err) return;
                  toast.error(err?.message || 'Taslak oluşturulamadı');
                }
              });
            }}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="creator-title">{t('titleLabel')}</Label>
              <Input
                id="creator-title"
                name="title"
                required
                placeholder={t('titlePlaceholder')}
                disabled={isPending}
              />
            </div>
            <div className="w-full space-y-2 sm:w-40">
              <Label>{t('typeLabel')}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yazı">{t('typePost')}</SelectItem>
                  <SelectItem value="Rehber">{t('typeGuide')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <input type="hidden" name="type" value={type} />
            <Button type="submit" className="brand-gradient" disabled={isPending}>
              {t('createDraft')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">{t('myPostsHeading')}</h2>
        {posts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t('emptyPosts')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id} className="glass-panel border-border/50">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{post.title}</p>
                      <Badge variant={statusVariant(post.status)}>{post.status}</Badge>
                      <Badge variant="outline">{post.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('updatedAt', {
                        date: new Date(post.updated_at).toLocaleString(),
                      })}
                    </p>
                    {post.review_note ? (
                      <p className="text-xs text-muted-foreground">
                        {t('reviewNote')}: {post.review_note}
                      </p>
                    ) : null}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/icerik/${post.id}/edit`}>
                      <FilePenLine className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      {t('edit')}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
