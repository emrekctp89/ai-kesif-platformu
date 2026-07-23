'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { useLocale, useTranslations } from 'next-intl';
import {
  Check,
  Circle,
  ExternalLink,
  Eye,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import {
  assistCreatorPost,
  assignCreatorPostTags,
  assignCreatorPostTools,
  submitCreatorPostForReview,
  updateCreatorPost,
  uploadCreatorCoverImage,
  withdrawCreatorPostFromReview,
} from '@/app/actions/contentCreators';
import {
  CREATOR_AUTOSAVE_MS,
  MIN_POST_CONTENT_LENGTH,
  MIN_POST_TITLE_LENGTH,
  buildReviewChecklist,
  plainTextFromMarkdown,
  validatePostForReview,
} from '@/lib/contentCreatorRules';
import { slugify } from '@/utils/slugify';
import { MultiSelectTools } from '@/components/MultiSelectTools';
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
import 'font-awesome/css/font-awesome.min.css';

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
 *   tools?: Array<{ id: number, name: string, slug?: string }>,
 *   selectedToolIds?: number[],
 *   isAdmin?: boolean,
 * }} props
 */
export function CreatorPostEditor({
  post,
  categories = [],
  tags = [],
  selectedTagIds: initialTagIds = [],
  tools = [],
  selectedToolIds: initialToolIds = [],
  isAdmin = false,
}) {
  const t = useTranslations('ContentStudio');
  const locale = useLocale();
  const router = useRouter();
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const snapshotRef = useRef('');
  const skipNextAutosaveRef = useRef(false);
  const slugTouchedRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [assistBusy, setAssistBusy] = useState(null); // mode string | null
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
  const [selectedTools, setSelectedTools] = useState(() => new Set(initialToolIds.map(Number)));

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
        'image',
        '|',
        'preview',
        'side-by-side',
      ],
      uploadImage: true,
      imageUploadFunction: (file, onSuccess, onError) => {
        const formData = new FormData();
        formData.set('image', file);
        formData.set('kind', 'body');
        const loadingId = toast.loading(t('coverImageUploading'));
        uploadCreatorCoverImage(formData)
          .then((result) => {
            toast.dismiss(loadingId);
            if (result?.success && result.url) {
              onSuccess(result.url);
              toast.success(t('toastBodyImageUploaded'));
              return;
            }
            const msg = result?.error || t('errCoverUpload');
            onError(msg);
            toast.error(msg);
          })
          .catch((err) => {
            toast.dismiss(loadingId);
            const msg = err?.message || t('errCoverUpload');
            onError(msg);
            toast.error(msg);
          });
      },
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
  const checklist = useMemo(
    () =>
      buildReviewChecklist({
        title,
        content,
        description,
        coverUrl,
        toolCount: selectedTools.size,
      }),
    [title, content, description, coverUrl, selectedTools]
  );

  function resolveSaveStatus() {
    if (isPublished && isAdmin) return 'Yayınlandı';
    if (inReview) return 'İncelemede';
    // Rejected stays rejected until re-submitted for review (or admin publishes).
    if (post.status === 'Reddedildi') return 'Reddedildi';
    return 'Taslak';
  }

  // Content-only snapshot drives autosave (tags/tools save on explicit Save / Submit).
  const buildContentSnapshot = useCallback(
    () =>
      JSON.stringify({
        title,
        description,
        slug,
        content,
        type,
        categoryId,
        coverUrl,
      }),
    [title, description, slug, content, type, categoryId, coverUrl]
  );

  const buildFullSnapshot = useCallback(
    () =>
      JSON.stringify({
        content: buildContentSnapshot(),
        tags: [...selectedTags].sort((a, b) => a - b),
        tools: [...selectedTools].sort((a, b) => a - b),
      }),
    [buildContentSnapshot, selectedTags, selectedTools]
  );

  useEffect(() => {
    snapshotRef.current = buildFullSnapshot();
    slugTouchedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- baseline only on post id change
  }, [post.id]);

  // Warn before leaving with unsaved changes (tags/tools included).
  useEffect(() => {
    if (lockedPublished) return undefined;
    const onBeforeUnload = (event) => {
      if (buildFullSnapshot() === snapshotRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [buildFullSnapshot, lockedPublished]);

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

  function toolsFormData(postId) {
    const fd = new FormData();
    fd.set('postId', String(postId));
    selectedTools.forEach((id) => fd.append('toolId', String(id)));
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

  function applySlugFromTitle() {
    const base = slugify(title.trim());
    if (!base) {
      toast.error(t('errTitleRequired'));
      return;
    }
    // Keep existing uniqueness suffix (e.g. -m1abc) when present on current slug.
    const suffixMatch = String(slug || '').match(/-([a-z0-9]{4,12})$/i);
    const next = suffixMatch ? `${base}-${suffixMatch[1]}` : `${base}-${Date.now().toString(36)}`;
    setSlug(next);
    slugTouchedRef.current = true;
  }

  async function runAssist(mode) {
    if (assistBusy || isPending || isUploadingCover) return;
    setAssistBusy(mode);
    try {
      const result = await assistCreatorPost({
        mode,
        title,
        description,
        content,
        locale,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      const text = String(result?.text || '').trim();
      if (!text) {
        toast.error(t('errAssistEmpty'));
        return;
      }
      if (mode === 'description') {
        setDescription(text);
        toast.success(t('toastAssistDescription'));
      } else if (mode === 'title') {
        setTitle(text);
        toast.success(t('toastAssistTitle'));
      } else if (mode === 'outline') {
        setContent((prev) => {
          const base = String(prev || '').trim();
          if (!base) return text;
          return `${base}\n\n${text}`;
        });
        toast.success(t('toastAssistOutline'));
      } else if (mode === 'improve') {
        setContent(text);
        toast.success(t('toastAssistImprove'));
      }
    } catch (err) {
      toast.error(err?.message || t('errAssistFailed'));
    } finally {
      setAssistBusy(null);
    }
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
        // Preserve pending tags/tools dirty state after content-only autosave.
        try {
          const prev = JSON.parse(snapshotRef.current || '{}');
          snapshotRef.current = JSON.stringify({
            content: buildContentSnapshot(),
            tags: prev.tags ?? [...selectedTags].sort((a, b) => a - b),
            tools: prev.tools ?? [...selectedTools].sort((a, b) => a - b),
          });
        } catch {
          snapshotRef.current = buildFullSnapshot();
        }
        setAutosaveState('saved');
        return { ok: true };
      }

      const [postResult, tagsResult, toolsResult] = await Promise.all([
        updateCreatorPost(formData),
        assignCreatorPostTags(tagsFormData(post.id)),
        assignCreatorPostTools(toolsFormData(post.id)),
      ]);
      if (postResult.error || tagsResult.error || toolsResult.error) {
        toast.error(postResult.error || tagsResult.error || toolsResult.error);
        return { error: true };
      }
      skipNextAutosaveRef.current = true;
      snapshotRef.current = buildFullSnapshot();
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
      selectedTools,
      inReview,
      isPublished,
      isAdmin,
      post.id,
      post.status,
      t,
      router,
      buildContentSnapshot,
      buildFullSnapshot,
    ]
  );

  // Debounced autosave while drafting / rejected / in-review edits (content fields only).
  useEffect(() => {
    if (lockedPublished) return undefined;
    if (isPending || isUploadingCover) return undefined;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return undefined;
    }

    let prevContent = '';
    try {
      prevContent = JSON.parse(snapshotRef.current || '{}').content || '';
    } catch {
      prevContent = '';
    }
    const nextContent = buildContentSnapshot();
    if (nextContent === prevContent) return undefined;
    if (!title.trim()) return undefined;

    setAutosaveState('dirty');
    const timer = setTimeout(() => {
      void persist({ autosave: true });
    }, CREATOR_AUTOSAVE_MS);

    return () => clearTimeout(timer);
  }, [
    buildContentSnapshot,
    title,
    description,
    slug,
    content,
    type,
    categoryId,
    coverUrl,
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
      await Promise.all([
        assignCreatorPostTags(tagsFormData(post.id)),
        assignCreatorPostTools(toolsFormData(post.id)),
      ]);
      const formData = withMeta(new FormData());
      const result = await submitCreatorPostForReview(formData);
      if (result.error) toast.error(result.error);
      else {
        skipNextAutosaveRef.current = true;
        snapshotRef.current = buildFullSnapshot();
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
        snapshotRef.current = buildFullSnapshot();
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
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {titleLen}/{MIN_POST_TITLE_LENGTH}+
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={Boolean(assistBusy) || isPending}
                  onClick={() => runAssist('title')}
                >
                  {assistBusy === 'title' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {t('assistTitle')}
                </Button>
              </div>
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="description">{t('descriptionLabel')}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                disabled={Boolean(assistBusy) || isPending}
                onClick={() => runAssist('description')}
              >
                {assistBusy === 'description' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {t('assistDescription')}
              </Button>
            </div>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Label>{t('contentMarkdownLabel')}</Label>
              <div className="flex flex-wrap items-center gap-1">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={Boolean(assistBusy) || isPending}
                  onClick={() => runAssist('outline')}
                >
                  {assistBusy === 'outline' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {t('assistOutline')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={Boolean(assistBusy) || isPending}
                  onClick={() => runAssist('improve')}
                >
                  {assistBusy === 'improve' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {t('assistImprove')}
                </Button>
              </div>
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
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="slug">{t('slugLabel')}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={isPending || isUploadingCover}
                    onClick={applySlugFromTitle}
                  >
                    {t('slugFromTitle')}
                  </Button>
                </div>
                <Input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => {
                    slugTouchedRef.current = true;
                    setSlug(e.target.value);
                  }}
                  required
                />
                <p className="text-[11px] text-muted-foreground">{t('slugHint')}</p>
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

              {tools.length > 0 ? (
                <div className="space-y-2">
                  <Label>{t('relatedToolsLabel')}</Label>
                  <p className="text-xs text-muted-foreground">{t('relatedToolsHint')}</p>
                  <MultiSelectTools
                    allTools={tools}
                    selectedTools={selectedTools}
                    onSelectionChange={setSelectedTools}
                    placeholder={t('relatedToolsPlaceholder')}
                    searchPlaceholder={t('relatedToolsSearch')}
                    emptyLabel={t('relatedToolsEmpty')}
                    disabled={isPending || isUploadingCover}
                    maxSelected={20}
                  />
                  {selectedTools.size > 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      {t('relatedToolsCount', { count: selectedTools.size })}
                    </p>
                  ) : null}
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

              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-xs font-semibold text-foreground">
                  {t('checklistHeading', {
                    score: checklist.score,
                    max: checklist.maxScore,
                  })}
                </p>
                <ul className="space-y-1.5">
                  {checklist.items.map((item) => {
                    const labelKey = {
                      title: 'checklistTitle',
                      content: 'checklistContent',
                      description: 'checklistDescription',
                      cover: 'checklistCover',
                      tools: 'checklistTools',
                    }[item.id];
                    return (
                      <li
                        key={item.id}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        {item.ok ? (
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50"
                            aria-hidden="true"
                          />
                        )}
                        <span className={item.ok ? 'text-foreground' : ''}>
                          {t(labelKey)}
                          {item.required ? (
                            <span className="text-muted-foreground">
                              {' '}
                              · {t('checklistRequired')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {' '}
                              · {t('checklistOptional')}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

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
