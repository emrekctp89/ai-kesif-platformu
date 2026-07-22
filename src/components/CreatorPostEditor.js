'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { Check, ExternalLink, Eye, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import {
  assignCreatorPostTags,
  submitCreatorPostForReview,
  updateCreatorPost,
  uploadCreatorCoverImage,
  withdrawCreatorPostFromReview,
} from '@/app/actions/contentCreators';
import {
  CREATOR_AUTOSAVE_MS,
  MIN_POST_CONTENT_LENGTH,
  MIN_POST_TITLE_LENGTH,
  plainTextFromMarkdown,
  validatePostForReview,
} from '@/lib/contentCreatorRules';
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
 *   isAdmin?: boolean,
 * }} props
 */
export function CreatorPostEditor({
  post,
  categories = [],
  tags = [],
  selectedTagIds: initialTagIds = [],
  isAdmin = false,
}) {
  const t = useTranslations('ContentStudio');
  const router = useRouter();
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const snapshotRef = useRef('');
  const skipNextAutosaveRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [autosaveState, setAutosaveState] = useState('idle'); // idle | dirty | saving | saved | error
  const [title, setTitle] = useState(post.title || '');
  const [description, setDescription] = useState(post.description || '');
  const [slug, setSlug] = useState(post.slug || '');
  const [content, setContent] = useState(post.content || '');
  const [type, setType] = useState(post.type || 'Yazı');
  const [categoryId, setCategoryId] = useState(
    post.category_id != null ? String(post.category_id) : 'none'
  );
  const [coverUrl, setCoverUrl] = useState(post.featured_image_url || '');
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

  // Creators cannot edit live posts; admins can keep editing while published.
  const isPublished = post.status === 'Yayınlandı';
  const lockedPublished = isPublished && !isAdmin;
  const inReview = post.status === 'İncelemede';
  const contentLen = plainTextFromMarkdown(content).length;
  const titleLen = plainTextFromMarkdown(title).length;
  const reviewReady = validatePostForReview({ title, content }).ok;

  function resolveSaveStatus() {
    if (isPublished && isAdmin) return 'Yayınlandı';
    if (inReview) return 'İncelemede';
    // Rejected stays rejected until re-submitted for review (or admin publishes).
    if (post.status === 'Reddedildi') return 'Reddedildi';
    return 'Taslak';
  }

  const buildSnapshot = useCallback(
    () =>
      JSON.stringify({
        title,
        description,
        slug,
        content,
        type,
        categoryId,
        coverUrl,
        tags: [...selectedTags].sort((a, b) => a - b),
      }),
    [title, description, slug, content, type, categoryId, coverUrl, selectedTags]
  );

  useEffect(() => {
    snapshotRef.current = buildSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- baseline only on post id change
  }, [post.id]);

  function withMeta(formData, { autosave = false } = {}) {
    formData.set('id', String(post.id));
    formData.set('title', title.trim());
    formData.set('description', description);
    formData.set('slug', slug.trim());
    formData.set('content', content);
    formData.set('type', type);
    formData.set('category_id', categoryId === 'none' ? '' : categoryId);
    formData.set('featured_image_url', coverUrl.trim());
    if (autosave) formData.set('autosave', '1');
    else formData.delete('autosave');
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

  async function handleCoverUpload(file) {
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const fd = new FormData();
      fd.set('image', file);
      const result = await uploadCreatorCoverImage(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setCoverUrl(result.url || '');
      toast.success(t('toastCoverUploaded'));
    } catch (err) {
      toast.error(err?.message || t('errCoverUpload'));
    } finally {
      setIsUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const persist = useCallback(
    async ({ autosave = false, status } = {}) => {
      if (!title.trim()) {
        if (!autosave) toast.error(t('errTitleRequired'));
        return { error: true };
      }

      const formData = withMeta(new FormData(), { autosave });
      formData.set('status', status || resolveSaveStatus());

      if (autosave) {
        setAutosaveState('saving');
        const postResult = await updateCreatorPost(formData);
        if (postResult.error) {
          setAutosaveState('error');
          return { error: true };
        }
        snapshotRef.current = buildSnapshot();
        setAutosaveState('saved');
        return { ok: true };
      }

      const [postResult, tagsResult] = await Promise.all([
        updateCreatorPost(formData),
        assignCreatorPostTags(tagsFormData(post.id)),
      ]);
      if (postResult.error || tagsResult.error) {
        toast.error(postResult.error || tagsResult.error);
        return { error: true };
      }
      skipNextAutosaveRef.current = true;
      snapshotRef.current = buildSnapshot();
      setAutosaveState('saved');
      toast.success(postResult.success || t('toastSaved'));
      router.refresh();
      return { ok: true };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form helpers close over latest state
    [
      title,
      description,
      slug,
      content,
      type,
      categoryId,
      coverUrl,
      selectedTags,
      inReview,
      isPublished,
      isAdmin,
      post.id,
      post.status,
      t,
      router,
      buildSnapshot,
    ]
  );

  // Debounced autosave while drafting / rejected / in-review edits.
  useEffect(() => {
    if (lockedPublished) return undefined;
    if (isPending || isUploadingCover) return undefined;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return undefined;
    }

    const nextSnap = buildSnapshot();
    if (nextSnap === snapshotRef.current) return undefined;
    if (!title.trim()) return undefined;

    setAutosaveState('dirty');
    const timer = setTimeout(() => {
      void persist({ autosave: true });
    }, CREATOR_AUTOSAVE_MS);

    return () => clearTimeout(timer);
  }, [
    buildSnapshot,
    title,
    description,
    slug,
    content,
    type,
    categoryId,
    coverUrl,
    selectedTags,
    lockedPublished,
    isPending,
    isUploadingCover,
    persist,
  ]);

  function save() {
    startTransition(async () => {
      await persist({ autosave: false });
    });
  }

  function submitReview() {
    const check = validatePostForReview({ title, content });
    if (!check.ok) {
      if (check.reason === 'title') {
        toast.error(t('errReviewTitleShort', { min: check.min, current: check.current }));
      } else {
        toast.error(t('errReviewContentShort', { min: check.min, current: check.current }));
      }
      return;
    }

    startTransition(async () => {
      await assignCreatorPostTags(tagsFormData(post.id));
      const formData = withMeta(new FormData());
      const result = await submitCreatorPostForReview(formData);
      if (result.error) toast.error(result.error);
      else {
        skipNextAutosaveRef.current = true;
        snapshotRef.current = buildSnapshot();
        toast.success(result.success || t('toastSubmitted'));
        router.refresh();
      }
    });
  }

  function withdraw() {
    startTransition(async () => {
      const formData = withMeta(new FormData());
      const result = await withdrawCreatorPostFromReview(formData);
      if (result.error) toast.error(result.error);
      else {
        skipNextAutosaveRef.current = true;
        snapshotRef.current = buildSnapshot();
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
    <form
      ref={formRef}
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input type="hidden" name="id" value={post.id} />
      {post.status === 'Reddedildi' ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">{t('rejectedEditorTitle')}</p>
          <p className="mt-1 text-muted-foreground">
            {post.review_note
              ? `${t('adminNotePrefix')}: ${post.review_note}`
              : t('rejectedNoNote')}
          </p>
          <p className="mt-1 text-muted-foreground">{t('resubmitHint')}</p>
        </div>
      ) : null}
      {inReview ? (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          {t('inReviewEditorHint')}
        </div>
      ) : null}
      {isPublished && isAdmin ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
          {t('adminPublishedEditHint')}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <Label htmlFor="title">{t('titleLabel')}</Label>
              <span className="text-[11px] text-muted-foreground">
                {titleLen}/{MIN_POST_TITLE_LENGTH}+
              </span>
            </div>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('descriptionLabel')}</Label>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <Label>{t('contentMarkdownLabel')}</Label>
              <span
                className={`text-[11px] ${
                  contentLen >= MIN_POST_CONTENT_LENGTH
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                }`}
              >
                {t('contentLengthHint', {
                  current: contentLen,
                  min: MIN_POST_CONTENT_LENGTH,
                })}
              </span>
            </div>
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
                <Input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
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

              <div className="space-y-2 border-t border-border/50 pt-4">
                <Label className="flex items-center gap-1.5">
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {t('coverImageLabel')}
                </Label>
                <p className="text-xs text-muted-foreground">{t('coverImageHint')}</p>
                {coverUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-border/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverUrl}
                      alt={t('coverImageAlt')}
                      className="h-36 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground">
                    {t('coverImageEmpty')}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(e) => handleCoverUpload(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending || isUploadingCover}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {isUploadingCover ? t('coverImageUploading') : t('coverImageUpload')}
                  </Button>
                  {coverUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending || isUploadingCover}
                      onClick={() => setCoverUrl('')}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      {t('coverImageRemove')}
                    </Button>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cover-url" className="text-xs">
                    {t('coverImageUrlLabel')}
                  </Label>
                  <Input
                    id="cover-url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder={t('coverImageUrlPlaceholder')}
                    disabled={isPending || isUploadingCover}
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  {t('statusLabel')}:{' '}
                  <span className="font-semibold text-foreground">
                    {statusLabel(post.status, t)}
                  </span>
                </p>
                <p className="flex items-center gap-1.5" aria-live="polite">
                  {autosaveState === 'saving' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      {t('autosaveSaving')}
                    </>
                  ) : null}
                  {autosaveState === 'saved' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                      {t('autosaveSaved')}
                    </>
                  ) : null}
                  {autosaveState === 'dirty' ? t('autosavePending') : null}
                  {autosaveState === 'error' ? (
                    <span className="text-destructive">{t('autosaveError')}</span>
                  ) : null}
                </p>
              </div>
              {post.review_note ? (
                <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {t('adminNotePrefix')}: {post.review_note}
                </p>
              ) : null}
              {!inReview && !isPublished && !reviewReady ? (
                <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                  {t('reviewRequirementsHint', {
                    titleMin: MIN_POST_TITLE_LENGTH,
                    contentMin: MIN_POST_CONTENT_LENGTH,
                  })}
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <Button type="submit" disabled={isPending || isUploadingCover}>
                  {isPending
                    ? t('saving')
                    : isPublished && isAdmin
                      ? t('savePublished')
                      : t('saveDraft')}
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href={`/icerik/${post.id}/preview`}>
                    <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {t('preview')}
                  </Link>
                </Button>
                {isPublished && isAdmin && post.slug ? (
                  <Button asChild type="button" variant="outline">
                    <Link href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      {t('viewPublishedPost')}
                    </Link>
                  </Button>
                ) : null}
                {inReview ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending || isUploadingCover}
                    onClick={withdraw}
                  >
                    {isPending ? t('saving') : t('withdrawReview')}
                  </Button>
                ) : !isPublished ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending || isUploadingCover || !reviewReady}
                    onClick={submitReview}
                  >
                    {isPending ? t('saving') : t('submitForReview')}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
