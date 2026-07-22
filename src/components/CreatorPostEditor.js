'use client';

import { useMemo, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { ExternalLink, Eye } from 'lucide-react';
import {
  assignCreatorPostTags,
  submitCreatorPostForReview,
  updateCreatorPost,
  withdrawCreatorPostFromReview,
} from '@/app/actions/contentCreators';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), { ssr: false });
import 'easymde/dist/easymde.min.css';

function statusLabel(status, t) {
  const map = {
    Taslak: t('statDraft'),
    İncelemede: t('statReview'),
    Yayınlandı: t('statPublished'),
    Reddedildi: t('statRejected'),
  };
  return map[status] || status;
}

/**
 * @param {{
 *   post: object,
 *   categories?: Array<{ id: number, name: string }>,
 *   tags?: Array<{ id: number, name: string }>,
 *   selectedTagIds?: number[],
 * }} props
 */
export function CreatorPostEditor({
  post,
  categories = [],
  tags = [],
  selectedTagIds: initialTagIds = [],
}) {
  const t = useTranslations('ContentStudio');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState(post.content || '');
  const [type, setType] = useState(post.type || 'Yazı');
  const [categoryId, setCategoryId] = useState(
    post.category_id != null ? String(post.category_id) : 'none'
  );
  const [selectedTags, setSelectedTags] = useState(() => new Set(initialTagIds.map(Number)));

  const editorOptions = useMemo(
    () => ({
      spellChecker: false,
      placeholder: t('editorPlaceholder'),
      toolbar: [
        'bold',
        'italic',
        'heading',
        '|',
        'quote',
        'unordered-list',
        'ordered-list',
        '|',
        'link',
        '|',
        'preview',
        'side-by-side',
      ],
    }),
    [t]
  );

  const lockedPublished = post.status === 'Yayınlandı';
  const inReview = post.status === 'İncelemede';

  function withMeta(formData) {
    formData.set('content', content);
    formData.set('type', type);
    formData.set('category_id', categoryId === 'none' ? '' : categoryId);
    return formData;
  }

  function tagsFormData(postId) {
    const fd = new FormData();
    fd.set('postId', String(postId));
    selectedTags.forEach((id) => fd.append('tagId', String(id)));
    return fd;
  }

  function toggleTag(tagId) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  function save(formData) {
    withMeta(formData);
    formData.set('status', inReview ? 'İncelemede' : 'Taslak');
    startTransition(async () => {
      const [postResult, tagsResult] = await Promise.all([
        updateCreatorPost(formData),
        assignCreatorPostTags(tagsFormData(post.id)),
      ]);
      if (postResult.error || tagsResult.error) {
        toast.error(postResult.error || tagsResult.error);
      } else {
        toast.success(postResult.success || t('toastSaved'));
        router.refresh();
      }
    });
  }

  function submitReview(formData) {
    withMeta(formData);
    startTransition(async () => {
      await assignCreatorPostTags(tagsFormData(post.id));
      const result = await submitCreatorPostForReview(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success || t('toastSubmitted'));
        router.refresh();
      }
    });
  }

  function withdraw(formData) {
    withMeta(formData);
    startTransition(async () => {
      const result = await withdrawCreatorPostFromReview(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success || t('toastWithdrawn'));
        router.refresh();
      }
    });
  }

  if (lockedPublished) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>{t('publishedLockedTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t('publishedLockedBody')}</p>
          {post.slug ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t('viewPublishedPost')}
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <form className="space-y-6">
      <input type="hidden" name="id" value={post.id} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="title">{t('titleLabel')}</Label>
            <Input id="title" name="title" defaultValue={post.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('descriptionLabel')}</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={post.description || ''}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('contentMarkdownLabel')}</Label>
            <SimpleMDE options={editorOptions} value={content} onChange={setContent} />
          </div>
        </div>

        <div className="space-y-4">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-base">{t('publishMetaTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">{t('slugLabel')}</Label>
                <Input id="slug" name="slug" defaultValue={post.slug} required />
              </div>
              <div className="space-y-2">
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
              {categories.length > 0 ? (
                <div className="space-y-2">
                  <Label>{t('categoryOptionalLabel')}</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('categorySelectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('categoryNone')}</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {tags.length > 0 ? (
                <div className="space-y-2">
                  <Label>{t('tagsLabel')}</Label>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2">
                    {tags.map((tag) => {
                      const checked = selectedTags.has(tag.id);
                      return (
                        <label
                          key={tag.id}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleTag(tag.id)}
                            aria-label={tag.name}
                          />
                          <span>{tag.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground">
                {t('statusLabel')}:{' '}
                <span className="font-semibold text-foreground">{statusLabel(post.status, t)}</span>
              </p>
              {post.review_note ? (
                <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {t('adminNotePrefix')}: {post.review_note}
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={(e) => {
                    const form = e.currentTarget.closest('form');
                    if (form) save(new FormData(form));
                  }}
                >
                  {t('saveDraft')}
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href={`/icerik/${post.id}/preview`}>
                    <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {t('preview')}
                  </Link>
                </Button>
                {inReview ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={(e) => {
                      const form = e.currentTarget.closest('form');
                      if (form) withdraw(new FormData(form));
                    }}
                  >
                    {t('withdrawReview')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending}
                    onClick={(e) => {
                      const form = e.currentTarget.closest('form');
                      if (form) submitReview(new FormData(form));
                    }}
                  >
                    {t('submitForReview')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
