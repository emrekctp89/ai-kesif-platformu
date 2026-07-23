'use client';

import { useMemo, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  FilePenLine,
  LayoutTemplate,
  ListOrdered,
  Plus,
  Scale,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import {
  createCreatorPost,
  deleteCreatorPost,
  duplicateCreatorPost,
} from '@/app/actions/contentCreators';
import { CREATOR_POST_TEMPLATES, summarizeCreatorStudio } from '@/lib/contentCreatorRules';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function statusVariant(status) {
  if (status === 'Yayınlandı') return 'default';
  if (status === 'İncelemede') return 'secondary';
  if (status === 'Reddedildi') return 'destructive';
  return 'outline';
}

function statusLabel(status, t) {
  const map = {
    Taslak: t('statDraft'),
    İncelemede: t('statReview'),
    Yayınlandı: t('statPublished'),
    Reddedildi: t('statRejected'),
  };
  return map[status] || status;
}

function typeLabel(type, t) {
  if (type === 'Yazı') return t('typePost');
  if (type === 'Rehber') return t('typeGuide');
  return type;
}

function DeleteDraftButton({
  postId,
  label,
  confirmTitle,
  confirmBody,
  cancelLabel,
  deleteLabel,
  deletedToast,
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm" disabled={isPending}>
          <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{confirmBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              startTransition(async () => {
                const fd = new FormData();
                fd.set('id', String(postId));
                const result = await deleteCreatorPost(fd);
                if (result.error) toast.error(result.error);
                else {
                  toast.success(result.success || deletedToast);
                  router.refresh();
                }
              });
            }}
          >
            {deleteLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DuplicatePostButton({ postId, label, successToast }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const fd = new FormData();
          fd.set('id', String(postId));
          const result = await duplicateCreatorPost(fd);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success(result?.message || successToast);
          if (result?.id) {
            router.push(`/icerik/${result.id}/edit`);
            router.refresh();
          } else {
            router.refresh();
          }
        });
      }}
    >
      <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
      {isPending ? '…' : label}
    </Button>
  );
}

const TEMPLATE_ICONS = {
  blank: FilePenLine,
  comparison: Scale,
  listicle: ListOrdered,
  tutorial: Sparkles,
  weekly: LayoutTemplate,
};

export function ContentStudioClient({ posts }) {
  const t = useTranslations('ContentStudio');
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState('Yazı');
  const [templateId, setTemplateId] = useState('blank');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');

  const insights = useMemo(() => summarizeCreatorStudio(posts), [posts]);
  const stats = {
    total: insights.total,
    draft: insights.draft,
    review: insights.review,
    published: insights.published,
    rejected: insights.rejected,
  };

  function selectTemplate(id) {
    setTemplateId(id);
    const tpl = CREATOR_POST_TEMPLATES.find((item) => item.id === id);
    if (tpl?.type) setType(tpl.type);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    return posts.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${p.title || ''} ${p.slug || ''} ${p.type || ''}`.toLocaleLowerCase('tr');
      return hay.includes(q);
    });
  }, [posts, statusFilter, query]);

  const filters = [
    { id: 'all', label: t('filterAll') },
    { id: 'Taslak', label: t('statDraft') },
    { id: 'İncelemede', label: t('statReview') },
    { id: 'Yayınlandı', label: t('statPublished') },
    { id: 'Reddedildi', label: t('statRejected') },
  ];

  const workflowSteps = [
    { icon: Plus, label: t('workflowStep1') },
    { icon: FilePenLine, label: t('workflowStep2') },
    { icon: Send, label: t('workflowStep3') },
    { icon: CheckCircle2, label: t('workflowStep4') },
  ];

  return (
    <div className="space-y-8">
      <Card className="glass-panel border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{t('workflowHeading')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('workflowSubheading')}</p>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.label}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/50 p-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    <p className="text-sm font-medium leading-snug">{step.label}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t('statTotal'), value: stats.total, filter: 'all' },
          { label: t('statDraft'), value: stats.draft, filter: 'Taslak' },
          { label: t('statReview'), value: stats.review, filter: 'İncelemede' },
          { label: t('statPublished'), value: stats.published, filter: 'Yayınlandı' },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setStatusFilter(item.filter)}
            className="text-left"
          >
            <Card
              className={`glass-panel border-border/50 transition-colors ${
                statusFilter === item.filter ? 'ring-2 ring-primary/40' : ''
              }`}
            >
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-extrabold tracking-tight">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {posts.length > 0 ? (
        <Card className="glass-panel border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t('insightsHeading')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('insightsSubheading')}</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">{t('insightsPublishRate')}</p>
              <p className="mt-1 text-xl font-extrabold tracking-tight">
                {insights.publishRate != null
                  ? t('insightsPublishRateValue', { percent: insights.publishRate })
                  : t('insightsPublishRateEmpty')}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">{t('insightsMix')}</p>
              <p className="mt-1 text-sm font-semibold">
                {t('insightsMixValue', {
                  articles: insights.articles,
                  guides: insights.guides,
                })}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">{t('insightsLastPublished')}</p>
              <p className="mt-1 text-sm font-semibold">
                {insights.lastPublishedAt
                  ? new Date(insights.lastPublishedAt).toLocaleDateString()
                  : t('insightsNeverPublished')}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">{t('insightsViews')}</p>
              <p className="mt-1 text-xl font-extrabold tracking-tight">
                {insights.totalViews > 0
                  ? t('insightsViewsValue', { count: insights.totalViews })
                  : t('insightsViewsEmpty')}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stats.rejected > 0 ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">
            {t('rejectedBannerTitle', { count: stats.rejected })}
          </p>
          <p className="mt-1 text-muted-foreground">{t('rejectedBannerBody')}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => setStatusFilter('Reddedildi')}
          >
            {t('rejectedBannerCta')}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" aria-hidden="true" />
            {t('newDraftTitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('templatesHeading')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            role="listbox"
            aria-label={t('templatesAria')}
          >
            {CREATOR_POST_TEMPLATES.map((tpl) => {
              const Icon = TEMPLATE_ICONS[tpl.id] || FilePenLine;
              const active = templateId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={isPending}
                  onClick={() => selectTemplate(tpl.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? 'border-primary/50 bg-primary/5 ring-2 ring-primary/30'
                      : 'border-border/60 bg-background/40 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-semibold leading-snug">{t(tpl.titleKey)}</p>
                      <p className="text-xs text-muted-foreground">{t(tpl.bodyKey)}</p>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {typeLabel(tpl.type, t)}
                      </Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <form
            action={async (formData) => {
              formData.set('type', type);
              formData.set('template_id', templateId);
              startTransition(async () => {
                try {
                  const result = await createCreatorPost(formData);
                  if (result?.error) toast.error(result.error);
                } catch (err) {
                  if (err && typeof err === 'object' && 'digest' in err) return;
                  toast.error(err?.message || t('toastCreateFailed'));
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
              <Select value={type} onValueChange={setType} disabled={isPending}>
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
            <input type="hidden" name="template_id" value={templateId} />
            <Button type="submit" className="brand-gradient" disabled={isPending}>
              {isPending ? t('creatingDraft') : t('createDraft')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold tracking-tight">{t('myPostsHeading')}</h2>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPostsPlaceholder')}
              aria-label={t('searchPostsAria')}
              className="h-9"
            />
            <div
              className="inline-flex flex-wrap gap-1 rounded-full border border-border/60 bg-background/70 p-1"
              role="tablist"
              aria-label={t('filterAria')}
            >
              {filters.map((item) => {
                const active = statusFilter === item.id;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'ghost'}
                    className="min-h-8 rounded-full px-3 text-xs"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatusFilter(item.id)}
                  >
                    {item.label}
                    {item.id !== 'all' && item.id === 'Reddedildi' && stats.rejected > 0
                      ? ` (${stats.rejected})`
                      : null}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="space-y-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {posts.length === 0 ? t('emptyPosts') : t('emptyFiltered')}
              </p>
              {posts.length === 0 ? (
                <p className="mx-auto max-w-md text-xs text-muted-foreground">
                  {t('emptyPostsHint')}
                </p>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setStatusFilter('all')}
                >
                  {t('filterAll')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((post) => {
              const rejected = post.status === 'Reddedildi';
              const inReview = post.status === 'İncelemede';
              return (
                <Card
                  key={post.id}
                  className={`glass-panel border-border/50 ${
                    rejected ? 'border-destructive/40 ring-1 ring-destructive/15' : ''
                  } ${inReview ? 'border-primary/30' : ''}`}
                >
                  <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {post.featured_image_url ? (
                        <div className="hidden h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border/50 sm:block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.featured_image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{post.title}</p>
                          <Badge variant={statusVariant(post.status)}>
                            {statusLabel(post.status, t)}
                          </Badge>
                          <Badge variant="outline">{typeLabel(post.type, t)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('updatedAt', {
                            date: new Date(post.updated_at).toLocaleString(),
                          })}
                        </p>
                        {rejected ? (
                          <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
                            {post.review_note
                              ? `${t('reviewNote')}: ${post.review_note}`
                              : t('rejectedNoNote')}
                            {' · '}
                            {t('resubmitHint')}
                          </p>
                        ) : null}
                        {inReview ? (
                          <p className="text-xs text-muted-foreground">{t('inReviewHint')}</p>
                        ) : null}
                        {!rejected && post.review_note ? (
                          <p className="text-xs text-muted-foreground">
                            {t('reviewNote')}: {post.review_note}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {post.status === 'Yayınlandı' && post.slug ? (
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            {t('viewLive')}
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/icerik/${post.id}/preview`}>
                            <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            {t('preview')}
                          </Link>
                        </Button>
                      )}
                      <Button asChild variant={rejected ? 'default' : 'outline'} size="sm">
                        <Link href={`/icerik/${post.id}/edit`}>
                          <FilePenLine className="mr-1.5 h-4 w-4" aria-hidden="true" />
                          {inReview
                            ? t('editOrWithdraw')
                            : rejected
                              ? t('editAndResubmit')
                              : t('edit')}
                        </Link>
                      </Button>
                      <DuplicatePostButton
                        postId={post.id}
                        label={t('duplicate')}
                        successToast={t('toastDuplicated')}
                      />
                      {post.status !== 'Yayınlandı' ? (
                        <DeleteDraftButton
                          postId={post.id}
                          label={t('delete')}
                          confirmTitle={t('deleteConfirmTitle')}
                          confirmBody={t('deleteConfirmBody')}
                          cancelLabel={t('deleteCancel')}
                          deleteLabel={t('deleteConfirmAction')}
                          deletedToast={t('toastDeleted')}
                        />
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
