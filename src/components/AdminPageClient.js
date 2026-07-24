/*
 * ---------------------------------------------------
 * 1. GÜNCELLENMİŞ BİLEŞEN: src/components/AdminPageClient.js
 * Bu, tüm sekmeleri ve interaktif yönetim araçlarını yöneten
 * nihai istemci bileşenidir.
 * ---------------------------------------------------
 */
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, Check, ExternalLink, Mail, ShieldAlert, Trash2 } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  approveTool,
  approveShowcaseItem,
  rejectTool,
  runToolQualityAutomation,
  runToolDiscoveryAdmin,
  runExistingToolEnrichmentAdmin,
  bulkTranslateToolsToEnglish,
  updateToolLinkReportStatus,
} from '@/app/actions';
import { deleteReportedComment, dismissAlert } from '@/app/actions/moderation';
import { AiToolFactory } from './AiToolFactory';
import { BlogManager } from './BlogManager';
import { ChallengeManager } from './ChallengeManager';
import { ContentReviewQueue } from './ContentReviewQueue';
import { CreatorApplicationsPanel } from './CreatorApplicationsPanel';
import { NewsletterManager } from './NewsletterManager';
import { TagManager } from './TagManager';
import { CategoryManager } from './CategoryManager';
import { FeaturedToggle } from './FeaturedToggle';
import { EditToolDialog } from './EditToolDialog';
import { DeleteToolButton } from './DeleteToolButton';
import {
  getToolQualityIssues,
  isLikelyEnglishDescription,
  normalizeToolLink,
} from '@/lib/toolQuality';
import { buildKasifQualityStats, isKasifIssueInteraction } from '@/lib/kasif/qualityStats';
import { formatKasifGoalLabel } from '@/lib/kasif/goalLabels';

function getQualityPriority(issues, duplicateNameCount, duplicateLinkCount) {
  if (issues.some((issue) => issue.key === 'link-invalid')) return 'high';
  if (duplicateLinkCount > 1) return 'high';
  if (issues.some((issue) => issue.key === 'source')) return 'high';
  if (issues.some((issue) => issue.key === 'english')) return 'high';
  if (issues.some((issue) => issue.key === 'link-review')) return 'medium';
  if (issues.some((issue) => issue.key === 'icon')) return 'medium';
  if (duplicateNameCount > 1) return 'medium';
  if (issues.length >= 2) return 'medium';
  if (issues.length === 1) return 'low';
  return 'clean';
}

function getQualityPriorityMeta(priority, t) {
  const meta = {
    high: {
      label: t('priorityHigh'),
      className: 'bg-red-600 hover:bg-red-600',
    },
    medium: {
      label: t('priorityMedium'),
      className: 'bg-orange-600 hover:bg-orange-600',
    },
    low: {
      label: t('priorityLow'),
      className: 'bg-sky-600 hover:bg-sky-600',
    },
    clean: {
      label: t('priorityClean'),
      className: 'bg-emerald-600 hover:bg-emerald-600',
    },
  };

  return meta[priority] || meta.clean;
}

function getQualityActionHint(issues, duplicateNameCount, duplicateLinkCount) {
  if (issues.some((issue) => issue.key === 'link-invalid')) {
    return 'Link audit bu kaydı kesin kırık işaretlemiş; resmi siteyi tarayıcıda aç, alternatif URL bul veya aracı pasife al.';
  }
  if (issues.some((issue) => issue.key === 'link-review')) {
    return 'Link audit manuel inceleme istiyor; 403/429 çoğu zaman bot korumasıdır, silmeden önce canlı sitede elle kontrol et.';
  }
  if (duplicateLinkCount > 1) {
    return 'Önce aynı bağlantıdaki kayıtları karşılaştır; en dolu kaydı koruyup diğerini sil veya birleştir.';
  }
  if (issues.some((issue) => issue.key === 'english')) {
    return 'Açıklamayı Türkçeleştir ve kullanıcı faydasını ilk cümlede netleştir.';
  }
  if (issues.some((issue) => issue.key === 'source')) {
    return "Bu kayıt dizin/ara toplayıcı siteye gidiyor; resmi ürün URL'sini bulup linki değiştir.";
  }
  if (duplicateNameCount > 1) {
    return 'Aynı adlı kayıtları kontrol et; gerçekten farklı ürün değilse tek kayda indir.';
  }
  if (issues.some((issue) => issue.key === 'metadata')) {
    return 'Fiyat modeli ve platform bilgisini tamamla; filtre sonuçları daha isabetli olur.';
  }
  if (issues.some((issue) => issue.key === 'icon')) {
    return 'Bağlantıyı doğrula; URL geçersizse araç ikonu alınamaz ve kartta fallback görünür.';
  }
  if (issues.some((issue) => issue.key === 'short')) {
    return 'Açıklamayı kullanım amacı, öne çıkan özellik ve hedef kullanıcıyla genişlet.';
  }

  return 'Kayıt iyi görünüyor; istersen öne çıkarma veya kategori doğruluğunu kontrol et.';
}

function getLinkAuditIssue(tool) {
  const status = String(tool.link_check_status || '')
    .trim()
    .toLowerCase();
  if (!status || status === 'valid' || status === 'skipped') return null;

  const checkedAt = tool.link_checked_at
    ? new Intl.DateTimeFormat('tr-TR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Europe/Istanbul',
      }).format(new Date(tool.link_checked_at))
    : null;
  const suffix = checkedAt ? ` · ${checkedAt}` : '';

  if (status === 'invalid') {
    return {
      key: 'link-invalid',
      label: `Kırık link${suffix}`,
    };
  }

  if (status === 'review') {
    return {
      key: 'link-review',
      label: `Link inceleme${suffix}`,
    };
  }

  return {
    key: 'link-review',
    label: `Link durumu: ${status}${suffix}`,
  };
}

const linkReportReasonLabels = {
  broken: 'Site açılmıyor / kırık link',
  redirects_wrong: 'Yanlış siteye yönlendiriyor',
  suspicious: 'Şüpheli veya güvenli görünmüyor',
  outdated: 'Link güncel değil',
  other: 'Diğer',
};

const linkReportStatusLabels = {
  open: 'Açık',
  reviewing: 'İncelemede',
  resolved: 'Çözüldü',
  dismissed: 'Geçersiz',
};

function formatReportDate(value) {
  if (!value) return 'Tarih yok';
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(value));
}

function getReportStatusBadgeClass(status) {
  if (status === 'open') return 'bg-red-600 hover:bg-red-600';
  if (status === 'reviewing') return 'bg-orange-600 hover:bg-orange-600';
  if (status === 'resolved') return 'bg-emerald-600 hover:bg-emerald-600';
  return 'bg-slate-600 hover:bg-slate-600';
}

function getCanonicalScore(tool) {
  const descriptionLength = String(tool.description || '').trim().length;
  let score = Math.min(descriptionLength, 300) / 30;

  if (!isLikelyEnglishDescription(tool.description)) score += 5;
  if (tool.pricing_model) score += 2;
  if (Array.isArray(tool.platforms) && tool.platforms.length > 0) score += 2;
  if (tool.tool_tags?.length > 0) score += 1;
  if (tool.is_featured) score += 2;

  try {
    const hostname = new URL(tool.link).hostname.replace(/^www\./, '');
    if (!hostname.endsWith('topai.tools')) score += 4;
  } catch {
    score -= 5;
  }

  return score;
}

function PendingToolCard({ tool, categories, allTags, hasDuplicateLink }) {
  const t = useTranslations('AdminClient');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const qualityWarnings = [
    !tool.description || tool.description.trim().length < 60 ? t('warnShortDesc') : null,
    !tool.category_id ? t('warnNoCategory') : null,
    !tool.link ? t('warnNoLink') : null,
    !tool.slug ? t('warnNoSlug') : null,
    hasDuplicateLink ? t('warnDupLink') : null,
  ].filter(Boolean);

  const runAction = (action, successFallback) => {
    const formData = new FormData();
    formData.set('toolId', tool.id);

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result?.success || successFallback);
      router.refresh();
    });
  };

  return (
    <article className="rounded-xl border border-border/50 bg-card p-4 shadow-sm glass-panel sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{tool.name}</h3>
            <Badge variant="outline">{tool.categories?.name || t('uncategorized')}</Badge>
            {qualityWarnings.length === 0 && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">{t('readyForReview')}</Badge>
            )}
          </div>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {tool.description || t('noDescription')}
          </p>

          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
              <dt className="sr-only">Gönderen</dt>
              <dd className="truncate">{tool.suggester_email || t('unknownSender')}</dd>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
              <dt className="sr-only">Gönderim tarihi</dt>
              <dd>
                {tool.created_at
                  ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Europe/Istanbul',
                    }).format(new Date(tool.created_at))
                  : t('unknownDate')}
              </dd>
            </div>
          </dl>

          {qualityWarnings.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Veri kalitesi uyarıları">
              {qualityWarnings.map((warning) => (
                <Badge
                  key={warning}
                  variant="secondary"
                  className="gap-1 text-amber-700 dark:text-amber-300"
                >
                  <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
                  {warning}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[260px] lg:justify-end">
          {tool.link && (
            <Button asChild variant="outline" size="sm">
              <a href={tool.link} target="_blank" rel="noopener noreferrer">
                {t('openSite')}
                <ExternalLink aria-hidden="true" className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
          <EditToolDialog tool={tool} categories={categories} allTags={allTags} />
          <Button
            size="sm"
            disabled={
              isPending ||
              qualityWarnings.includes(t('warnNoLink')) ||
              qualityWarnings.includes(t('warnNoCategory')) ||
              qualityWarnings.includes(t('warnNoSlug'))
            }
            onClick={() => runAction(approveTool, t('approvedSuccess'))}
          >
            <Check aria-hidden="true" className="mr-2 h-4 w-4" />
            {isPending ? t('processing') : t('approve')}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isPending}>
                <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
                {t('reject')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('confirmRejectTitle', { name: tool.name })}</AlertDialogTitle>
                <AlertDialogDescription>{t('confirmRejectBody')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => runAction(rejectTool, t('rejectedSuccess'))}
                >
                  {t('confirmRejectAction')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </article>
  );
}

// "İçerik Onayı" Sekmesi
function ApprovalQueueTab({
  unapprovedTools,
  unapprovedShowcaseItems,
  approvedTools,
  categories,
  allTags,
}) {
  const t = useTranslations('AdminClient');
  const approvedLinks = new Set(approvedTools.map((tool) => normalizeToolLink(tool.link)));
  return (
    <div className="space-y-6">
      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>{t('pendingToolsTitle', { count: unapprovedTools.length })}</CardTitle>
          <CardDescription>
            Siteyi ve veri kalitesi uyarılarını inceleyin; gerekirse düzenledikten sonra onaylayın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unapprovedTools.length > 0 ? (
            <div className="space-y-4">
              {unapprovedTools.map((tool) => (
                <PendingToolCard
                  key={tool.id}
                  tool={tool}
                  categories={categories}
                  allTags={allTags}
                  hasDuplicateLink={approvedLinks.has(normalizeToolLink(tool.link))}
                />
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-muted-foreground">{t('pendingToolsEmpty')}</p>
          )}
        </CardContent>
      </Card>
      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>
            {t('pendingShowcaseTitle', { count: unapprovedShowcaseItems.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unapprovedShowcaseItems.length > 0 ? (
            <div className="space-y-4">
              {unapprovedShowcaseItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-4 rounded-xl bg-muted p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-4">
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      width={64}
                      height={64}
                      className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
                    />
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.profiles?.email || t('unknownSender')}
                      </p>
                    </div>
                  </div>
                  <form action={approveShowcaseItem}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <Button type="submit" className="w-full sm:w-auto">
                      {t('approve')}
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-muted-foreground">{t('pendingShowcaseEmpty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// YENİ: "Araç Yönetimi" Sekmesi
function ToolManagementTab({ approvedTools, categories, allTags }) {
  const t = useTranslations('AdminClient');
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [qualityFilter, setQualityFilter] = React.useState('all');
  const [priorityFilter, setPriorityFilter] = React.useState('all');
  const [sortMode, setSortMode] = React.useState('issues');
  const [duplicateView, setDuplicateView] = React.useState('groups');
  const [iconAuditByToolId, setIconAuditByToolId] = React.useState({});
  const [iconAuditMeta, setIconAuditMeta] = React.useState({
    running: false,
    processed: 0,
    total: 0,
  });
  const [isAutomationPending, startAutomationTransition] = React.useTransition();
  const [automationReport, setAutomationReport] = React.useState(null);
  const duplicateNames = React.useMemo(() => {
    const counts = new Map();
    approvedTools.forEach((tool) => {
      const key = String(tool.name || '')
        .trim()
        .toLocaleLowerCase('tr-TR');
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [approvedTools]);
  const duplicateLinks = React.useMemo(() => {
    const counts = new Map();
    approvedTools.forEach((tool) => {
      const key = normalizeToolLink(tool.link);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [approvedTools]);

  React.useEffect(() => {
    let cancelled = false;
    const auditableTools = approvedTools.filter(
      (tool) => String(tool.link || '').trim().length > 0
    );

    setIconAuditByToolId({});
    setIconAuditMeta({
      running: auditableTools.length > 0,
      processed: 0,
      total: auditableTools.length,
    });

    if (auditableTools.length === 0) return () => {};

    const queue = [...auditableTools];
    const concurrency = 6;

    const runWorker = async () => {
      while (queue.length > 0 && !cancelled) {
        const tool = queue.shift();
        if (!tool) break;

        let status = 'fail';
        try {
          const response = await fetch(`/api/tool-icon?link=${encodeURIComponent(tool.link)}`, {
            cache: 'no-store',
          });
          status = response.ok ? 'ok' : 'fail';
        } catch {
          status = 'fail';
        }

        if (cancelled) return;

        setIconAuditByToolId((prev) => ({
          ...prev,
          [tool.id]: status,
        }));
        setIconAuditMeta((prev) => ({
          ...prev,
          processed: prev.processed + 1,
        }));
      }
    };

    Promise.all(Array.from({ length: concurrency }, runWorker)).then(() => {
      if (cancelled) return;
      setIconAuditMeta((prev) => ({
        ...prev,
        running: false,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [approvedTools]);

  const auditedTools = React.useMemo(
    () =>
      approvedTools.map((tool) => {
        const hasIconFetchIssue = iconAuditByToolId[tool.id] === 'fail';
        const issues = getToolQualityIssues(tool, duplicateNames, duplicateLinks, {
          iconFetchIssue: hasIconFetchIssue,
        });
        const linkAuditIssue = getLinkAuditIssue(tool);
        if (linkAuditIssue) issues.unshift(linkAuditIssue);
        const duplicateNameCount =
          duplicateNames.get(
            String(tool.name || '')
              .trim()
              .toLocaleLowerCase('tr-TR')
          ) || 0;
        const duplicateLinkCount = duplicateLinks.get(normalizeToolLink(tool.link)) || 0;
        const priority = getQualityPriority(issues, duplicateNameCount, duplicateLinkCount);

        return {
          tool,
          issues,
          duplicateNameCount,
          duplicateLinkCount,
          priority,
          actionHint: getQualityActionHint(issues, duplicateNameCount, duplicateLinkCount),
        };
      }),
    [approvedTools, duplicateLinks, duplicateNames, iconAuditByToolId]
  );
  const qualityCounts = React.useMemo(
    () => ({
      all: auditedTools.length,
      duplicate: auditedTools.filter(({ issues }) =>
        issues.some((issue) => issue.key === 'duplicate')
      ).length,
      english: auditedTools.filter(({ issues }) => issues.some((issue) => issue.key === 'english'))
        .length,
      source: auditedTools.filter(({ issues }) => issues.some((issue) => issue.key === 'source'))
        .length,
      short: auditedTools.filter(({ issues }) => issues.some((issue) => issue.key === 'short'))
        .length,
      metadata: auditedTools.filter(({ issues }) =>
        issues.some((issue) => issue.key === 'metadata')
      ).length,
      icon: auditedTools.filter(({ issues }) => issues.some((issue) => issue.key === 'icon'))
        .length,
      linkReview: auditedTools.filter(({ issues }) =>
        issues.some((issue) => issue.key === 'link-review')
      ).length,
      linkInvalid: auditedTools.filter(({ issues }) =>
        issues.some((issue) => issue.key === 'link-invalid')
      ).length,
      linkAudit: auditedTools.filter(({ issues }) =>
        issues.some((issue) => issue.key === 'link-review' || issue.key === 'link-invalid')
      ).length,
      high: auditedTools.filter(({ priority }) => priority === 'high').length,
      medium: auditedTools.filter(({ priority }) => priority === 'medium').length,
      low: auditedTools.filter(({ priority }) => priority === 'low').length,
      ready: auditedTools.filter(({ issues }) => issues.length === 0).length,
    }),
    [auditedTools]
  );
  const activeIssueCount = qualityCounts.all - qualityCounts.ready;
  const qualityPresets = [
    {
      value: 'duplicate',
      label: 'Tekrarlar',
      count: qualityCounts.duplicate,
      tone: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    },
    {
      value: 'english',
      label: 'İngilizce açıklama',
      count: qualityCounts.english,
      tone: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    {
      value: 'source',
      label: 'Dizin linki',
      count: qualityCounts.source,
      tone: 'border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-300',
    },
    {
      value: 'link-audit',
      label: 'Link inceleme',
      count: qualityCounts.linkAudit,
      tone: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    },
    {
      value: 'short',
      label: 'Kısa açıklama',
      count: qualityCounts.short,
      tone: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    },
    {
      value: 'metadata',
      label: 'Eksik metadata',
      count: qualityCounts.metadata,
      tone: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
    {
      value: 'icon',
      label: 'İkon sorunu',
      count: qualityCounts.icon,
      tone: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    },
  ];
  const priorityLabels = {
    all: 'tüm öncelikler',
    high: 'yüksek öncelik',
    medium: 'orta öncelik',
    low: 'düşük öncelik',
    clean: 'temiz kayıtlar',
  };
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('tr-TR');
  const filteredTools = auditedTools
    .filter(({ tool, issues, priority }) => {
      const matchesSearch =
        !normalizedSearch ||
        [tool.name, tool.description, tool.category_name, tool.link].some((value) =>
          String(value || '')
            .toLocaleLowerCase('tr-TR')
            .includes(normalizedSearch)
        );
      const matchesQuality =
        qualityFilter === 'all' ||
        (qualityFilter === 'link-audit'
          ? issues.some((issue) => issue.key === 'link-review' || issue.key === 'link-invalid')
          : false) ||
        (qualityFilter === 'ready'
          ? issues.length === 0
          : issues.some((issue) => issue.key === qualityFilter));
      const matchesPriority = priorityFilter === 'all' || priority === priorityFilter;

      return matchesSearch && matchesQuality && matchesPriority;
    })
    .sort((a, b) => {
      if (sortMode === 'name') {
        return String(a.tool.name || '').localeCompare(String(b.tool.name || ''), 'tr');
      }
      if (sortMode === 'newest') {
        return new Date(b.tool.created_at || 0) - new Date(a.tool.created_at || 0);
      }
      if (sortMode === 'oldest') {
        return new Date(a.tool.created_at || 0) - new Date(b.tool.created_at || 0);
      }

      const duplicateWeight = (entry) =>
        Math.max(entry.duplicateNameCount, entry.duplicateLinkCount) * 2;
      const priorityWeight = { high: 30, medium: 20, low: 10, clean: 0 };
      return (
        (priorityWeight[b.priority] || 0) +
          b.issues.length +
          duplicateWeight(b) -
          ((priorityWeight[a.priority] || 0) + a.issues.length + duplicateWeight(a)) ||
        String(a.tool.name || '').localeCompare(String(b.tool.name || ''), 'tr')
      );
    });
  const duplicateGroups = React.useMemo(() => {
    const groups = new Map();

    auditedTools.forEach((entry) => {
      if (entry.duplicateNameCount <= 1 && entry.duplicateLinkCount <= 1) {
        return;
      }

      const normalizedLink = normalizeToolLink(entry.tool.link);
      const normalizedName = String(entry.tool.name || '')
        .trim()
        .toLocaleLowerCase('tr-TR');
      const groupKey =
        entry.duplicateLinkCount > 1 ? `link:${normalizedLink}` : `name:${normalizedName}`;

      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(entry);
    });

    return Array.from(groups.entries())
      .map(([key, entries]) => {
        const sortedEntries = [...entries].sort(
          (a, b) =>
            getCanonicalScore(b.tool) - getCanonicalScore(a.tool) ||
            new Date(a.tool.created_at || 0) - new Date(b.tool.created_at || 0)
        );
        return {
          key,
          entries: sortedEntries,
          recommendedId: sortedEntries[0]?.tool.id,
        };
      })
      .filter(({ entries }) => entries.length > 1)
      .sort(
        (a, b) =>
          b.entries.length - a.entries.length ||
          String(a.entries[0]?.tool.name || '').localeCompare(
            String(b.entries[0]?.tool.name || ''),
            'tr'
          )
      );
  }, [auditedTools]);
  const visibleDuplicateGroups = duplicateGroups.filter(({ entries }) =>
    entries.some(
      ({ tool, priority }) =>
        (priorityFilter === 'all' || priority === priorityFilter) &&
        (!normalizedSearch ||
          [tool.name, tool.description, tool.category_name, tool.link].some((value) =>
            String(value || '')
              .toLocaleLowerCase('tr-TR')
              .includes(normalizedSearch)
          ))
    )
  );
  const [discoveryReport, setDiscoveryReport] = React.useState(null);
  const [isDiscoveryPending, startDiscoveryTransition] = React.useTransition();
  const [enrichmentReport, setEnrichmentReport] = React.useState(null);
  const [isEnrichmentPending, startEnrichmentTransition] = React.useTransition();
  const [enBulkReport, setEnBulkReport] = React.useState(null);
  const [isEnBulkPending, startEnBulkTransition] = React.useTransition();

  const runAutomation = () => {
    startAutomationTransition(async () => {
      const result = await runToolQualityAutomation();
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      setAutomationReport(result);
      if (result.updatedCount > 0) {
        toast.success(
          `${result.updatedCount} kayıt güncellendi${
            result.aiDescriptionFixCount > 0
              ? `, ${result.aiDescriptionFixCount} açıklama AI ile iyileştirildi`
              : ''
          }${
            result.fallbackDescriptionFixCount > 0
              ? `, ${result.fallbackDescriptionFixCount} kısa açıklama otomatik genişletildi`
              : ''
          }.`
        );
      } else {
        toast(
          `Güncelleme yapılmadı. Taranan: ${result.scannedCount}, kısa açıklama: ${result.shortDescriptionCount}, İngilizce açıklama: ${result.englishDescriptionCount}${
            result.aiRateLimitHitCount > 0 ? `, AI limit hatası: ${result.aiRateLimitHitCount}` : ''
          }.`
        );
      }
      router.refresh();
    });
  };

  const runDiscovery = (dryRun = true) => {
    startDiscoveryTransition(async () => {
      const result = await runToolDiscoveryAdmin({ dryRun, limit: 5, autoApprove: false });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setDiscoveryReport(result.report);
      const accepted =
        result.report?.acceptedCount ??
        result.report?.acceptedCandidates?.length ??
        result.report?.accepted?.length ??
        result.report?.insertedCount ??
        0;
      const skipped = result.report?.skippedCount ?? result.report?.skipped?.length ?? 0;
      toast.success(
        dryRun
          ? `Keşif dry-run: ${accepted} aday, ${skipped} atlandı`
          : `Keşif tamam: ${accepted} eklendi (onay kuyruğu), ${skipped} atlandı`
      );
      if (!dryRun) router.refresh();
    });
  };

  const runEnrichment = (dryRun = true) => {
    startEnrichmentTransition(async () => {
      const result = await runExistingToolEnrichmentAdmin({ dryRun, limit: 5 });
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      setEnrichmentReport(result.report);
      const candidateCount = result.report?.candidateCount ?? 0;
      const updatedCount = result.report?.updatedCount ?? 0;
      const failedCount = result.report?.failedCount ?? 0;

      toast.success(
        dryRun
          ? `Mevcut araç enrichment dry-run: ${candidateCount} aday, ${failedCount} hata`
          : `Mevcut araç enrichment: ${updatedCount} araç güncellendi, ${failedCount} hata`
      );
      if (!dryRun) router.refresh();
    });
  };

  const runEnBulk = () => {
    startEnBulkTransition(async () => {
      const result = await bulkTranslateToolsToEnglish({ limit: 8 });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setEnBulkReport(result);
      if (result.updatedCount > 0) {
        toast.success(
          `${result.updatedCount} araç EN alanları dolduruldu${
            result.failedCount ? `, ${result.failedCount} hata` : ''
          }.`
        );
      } else {
        toast(result.message || 'Güncellenecek EN eksik araç yok.');
      }
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('manageToolsTitle')}</CardTitle>
        <CardDescription>
          Veri kalitesi sorunlarını filtreleyin; araçları düzenleyin, silin veya öne çıkarın.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1.2fr_2fr]">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-semibold">{t('qualityQueue')}</p>
            <p className="mt-1 text-2xl font-bold">{activeIssueCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Düzeltme gerektiren kayıt; sorunsuz kayıt sayısı {qualityCounts.ready}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={runAutomation} disabled={isAutomationPending}>
                {isAutomationPending ? 'Otomasyon çalışıyor...' : 'Akıllı düzeltmeyi çalıştır'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runDiscovery(true)}
                disabled={isDiscoveryPending}
              >
                {isDiscoveryPending ? 'Keşif çalışıyor...' : 'AI keşif (dry-run)'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runEnrichment(true)}
                disabled={isEnrichmentPending}
              >
                {isEnrichmentPending ? 'Zenginleştirme…' : 'Mevcut araç enrichment (dry-run)'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="secondary" disabled={isEnrichmentPending}>
                    Mevcut araçları güncelle (5)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mevcut araç detayları güncellensin mi?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Gemini, eski araçların açıklama, fiyat, platform ve teknik detay alanlarını
                      zenginleştirecek. En fazla 5 onaylı araç güncellenir. Önce dry-run sonucunu
                      kontrol etmeniz önerilir.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                    <AlertDialogAction onClick={() => runEnrichment(false)}>
                      Evet, 5 aracı güncelle
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="secondary" disabled={isDiscoveryPending}>
                    Keşfi kaydet (onay kuyruğu)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Keşfi veritabanına yaz?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Gemini adayları onaylanmamış araç olarak eklenecek (is_approved=false).
                      Dry-run değil; gerçek insert yapılır. Devam edilsin mi?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                    <AlertDialogAction onClick={() => runDiscovery(false)}>
                      Evet, kaydet
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" variant="outline" onClick={runEnBulk} disabled={isEnBulkPending}>
                {isEnBulkPending ? 'EN çeviri…' : 'Toplu EN çevir (8)'}
              </Button>
            </div>
            {automationReport && (
              <p className="mt-2 text-xs text-muted-foreground">
                Son çalışma: {automationReport.updatedCount} güncellendi,{' '}
                {automationReport.inferredPricingCount} fiyat modeli ve{' '}
                {automationReport.defaultedPlatformCount} platform alanı otomatik dolduruldu,{' '}
                {automationReport.aiDescriptionFixCount} açıklama AI ile iyileştirildi,{' '}
                {automationReport.fallbackDescriptionFixCount} kısa açıklama fallback ile düzeltildi
                {automationReport.aiRateLimitHitCount > 0
                  ? `, ${automationReport.aiRateLimitHitCount} kayıt AI limitine takıldı.`
                  : '.'}
              </p>
            )}
            {discoveryReport && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p>
                  Son keşif: aday{' '}
                  {discoveryReport.acceptedCount ??
                    discoveryReport.acceptedCandidates?.length ??
                    discoveryReport.accepted?.length ??
                    discoveryReport.insertedCount ??
                    0}
                  , atlanan {discoveryReport.skippedCount ?? discoveryReport.skipped?.length ?? 0}
                  {discoveryReport.dryRun ? ' (dry-run)' : ' (kayıtlı)'}.
                </p>
                {(discoveryReport.acceptedCandidates || discoveryReport.accepted || [])
                  .slice(0, 5)
                  .map((item) => (
                    <p key={item.slug || item.name} className="truncate pl-2">
                      • {item.name}
                      {item.link ? ` — ${item.link}` : ''}
                    </p>
                  ))}
              </div>
            )}
            {enrichmentReport && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p>
                  Son enrichment: {enrichmentReport.candidateCount} aday,{' '}
                  {enrichmentReport.updatedCount} güncellendi, {enrichmentReport.failedCount} hata
                  {enrichmentReport.dryRun ? ' (dry-run)' : ' (kayıtlı)'}.
                </p>
                {(enrichmentReport.results || []).slice(0, 5).map((item) => (
                  <p key={item.id || item.slug || item.name} className="truncate pl-2">
                    • {item.name}
                    {item.error
                      ? ` — hata: ${item.error}`
                      : ` — alan: ${Object.keys(item.updates || {}).join(', ') || 'değişiklik yok'}`}
                  </p>
                ))}
              </div>
            )}
            {enBulkReport && (
              <p className="mt-1 text-xs text-muted-foreground">
                Son EN toplu çeviri: {enBulkReport.updatedCount}/{enBulkReport.scannedCount}{' '}
                güncellendi
                {enBulkReport.failedCount ? `, ${enBulkReport.failedCount} hata` : ''}.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge className="bg-red-600 hover:bg-red-600">{qualityCounts.high} yüksek</Badge>
              <Badge className="bg-orange-600 hover:bg-orange-600">
                {qualityCounts.medium} orta
              </Badge>
              <Badge className="bg-sky-600 hover:bg-sky-600">{qualityCounts.low} düşük</Badge>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {qualityPresets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setQualityFilter(preset.value)}
                className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  qualityFilter === preset.value ? preset.tone : 'bg-background hover:bg-muted/50'
                }`}
                aria-pressed={qualityFilter === preset.value}
              >
                <span className="block text-xs font-medium text-muted-foreground">
                  {preset.label}
                </span>
                <span className="mt-1 block text-xl font-bold">{preset.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_190px_190px]">
          <Input
            placeholder="İsim, açıklama, kategori veya bağlantı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Araçlarda ara"
          />
          <select
            value={qualityFilter}
            onChange={(event) => setQualityFilter(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Veri kalitesi filtresi"
          >
            <option value="all">Tüm araçlar ({qualityCounts.all})</option>
            <option value="duplicate">Tekrarlar ({qualityCounts.duplicate})</option>
            <option value="english">İngilizce açıklama ({qualityCounts.english})</option>
            <option value="source">Dizin linki ({qualityCounts.source})</option>
            <option value="link-audit">Link inceleme ({qualityCounts.linkAudit})</option>
            <option value="short">Kısa açıklama ({qualityCounts.short})</option>
            <option value="metadata">Eksik fiyat/platform ({qualityCounts.metadata})</option>
            <option value="icon">İkon sorunu ({qualityCounts.icon})</option>
            <option value="ready">Sorunsuz ({qualityCounts.ready})</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Öncelik filtresi"
          >
            <option value="all">Tüm öncelikler</option>
            <option value="high">Yüksek ({qualityCounts.high})</option>
            <option value="medium">Orta ({qualityCounts.medium})</option>
            <option value="low">Düşük ({qualityCounts.low})</option>
            <option value="clean">Temiz ({qualityCounts.ready})</option>
          </select>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Araç sıralaması"
          >
            <option value="issues">En çok sorun önce</option>
            <option value="name">İsme göre</option>
            <option value="newest">En yeni kayıtlar</option>
            <option value="oldest">En eski kayıtlar</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Veri kalitesi özeti">
          <Badge variant="secondary">{qualityCounts.duplicate} tekrarlı kayıt</Badge>
          <Badge variant="secondary">{qualityCounts.english} İngilizce açıklama</Badge>
          <Badge variant="secondary">{qualityCounts.source} dizin linki</Badge>
          <Badge variant="secondary">
            {qualityCounts.linkAudit} link inceleme
            {qualityCounts.linkInvalid > 0 ? ` (${qualityCounts.linkInvalid} kırık)` : ''}
          </Badge>
          <Badge variant="secondary">{qualityCounts.short} kısa açıklama</Badge>
          <Badge variant="secondary">{qualityCounts.metadata} eksik metadata</Badge>
          <Badge variant="secondary">{qualityCounts.icon} ikon sorunu</Badge>
        </div>

        <p className="text-xs text-muted-foreground" role="status">
          {iconAuditMeta.running
            ? `İkon denetimi sürüyor: ${iconAuditMeta.processed}/${iconAuditMeta.total}`
            : `İkon denetimi tamamlandı: ${iconAuditMeta.processed}/${iconAuditMeta.total}`}
        </p>

        {qualityFilter === 'duplicate' && (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{visibleDuplicateGroups.length} tekrar kümesi</p>
              <p className="text-xs text-muted-foreground">
                Önerilen kayıt, veri doluluğu ve resmî bağlantı olasılığına göre hesaplanır.
              </p>
            </div>
            <select
              value={duplicateView}
              onChange={(event) => setDuplicateView(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Tekrar görünümü"
            >
              <option value="groups">Kümeler halinde</option>
              <option value="list">Düz liste</option>
            </select>
          </div>
        )}

        <p className="text-sm text-muted-foreground" role="status">
          {qualityFilter === 'duplicate' && duplicateView === 'groups'
            ? `${visibleDuplicateGroups.length} tekrar kümesi gösteriliyor · ${priorityLabels[priorityFilter]}.`
            : `${filteredTools.length} araç gösteriliyor · ${priorityLabels[priorityFilter]}.`}
        </p>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {qualityFilter === 'duplicate' && duplicateView === 'groups'
            ? visibleDuplicateGroups.map((group) => (
                <section
                  key={group.key}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{group.entries[0].tool.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group.entries.length} kayıt karşılaştırılıyor
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {group.key.startsWith('link:') ? 'Aynı bağlantı' : 'Aynı ad'}
                    </Badge>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {group.entries.map(({ tool, issues }) => (
                      <article key={tool.id} className="rounded-lg border bg-background p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{tool.category_name || 'Kategorisiz'}</Badge>
                          {tool.id === group.recommendedId && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">
                              Korunması önerilen
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">#{tool.id}</span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                          {tool.description || 'Açıklama yok.'}
                        </p>
                        <p className="mt-2 truncate text-xs text-muted-foreground">
                          {normalizeToolLink(tool.link)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {issues.map((issue, index) => (
                            <Badge
                              key={`${issue.key}-${issue.label}-${index}`}
                              variant="secondary"
                              className="text-amber-700 dark:text-amber-300"
                            >
                              {issue.label}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/tool/${tool.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Canlı sayfa
                              <ExternalLink aria-hidden="true" className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                          <EditToolDialog tool={tool} categories={categories} allTags={allTags} />
                          <DeleteToolButton toolId={tool.id} toolName={tool.name} />
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))
            : filteredTools.map(
                ({
                  tool,
                  issues,
                  duplicateNameCount,
                  duplicateLinkCount,
                  priority,
                  actionHint,
                }) => (
                  <div
                    key={tool.id}
                    className="p-3 rounded-lg border flex flex-wrap justify-between items-start gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{tool.name}</h3>
                        <Badge variant="outline">{tool.category_name || 'Kategorisiz'}</Badge>
                        <Badge className={getQualityPriorityMeta(priority, t).className}>
                          {getQualityPriorityMeta(priority, t).label}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {tool.description || 'Açıklama yok.'}
                      </p>
                      {actionHint && (
                        <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
                          {actionHint}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {duplicateLinkCount > 1 && (
                          <Badge className="bg-red-600 hover:bg-red-600">
                            Aynı bağlantıda {duplicateLinkCount} kayıt
                          </Badge>
                        )}
                        {duplicateNameCount > 1 && (
                          <Badge className="bg-orange-600 hover:bg-orange-600">
                            Aynı adda {duplicateNameCount} kayıt
                          </Badge>
                        )}
                        {issues.length > 0 ? (
                          issues.map((issue, index) => (
                            <Badge
                              key={`${issue.key}-${issue.label}-${index}`}
                              variant="secondary"
                              className="text-amber-700 dark:text-amber-300"
                            >
                              {issue.label}
                            </Badge>
                          ))
                        ) : (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">
                            Veri kalitesi iyi
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <FeaturedToggle toolId={tool.id} isFeatured={tool.is_featured} />
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/tool/${tool.slug}`} target="_blank" rel="noopener noreferrer">
                          Canlı sayfa
                          <ExternalLink aria-hidden="true" className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <EditToolDialog tool={tool} categories={categories} allTags={allTags} />
                      <DeleteToolButton toolId={tool.id} toolName={tool.name} />
                    </div>
                  </div>
                )
              )}
          {((qualityFilter === 'duplicate' &&
            duplicateView === 'groups' &&
            visibleDuplicateGroups.length === 0) ||
            (!(qualityFilter === 'duplicate' && duplicateView === 'groups') &&
              filteredTools.length === 0)) && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Bu arama ve kalite filtresiyle eşleşen araç bulunamadı.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LinkReportCard({ report }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const tool = report.tools;

  const handleAction = (formData) => {
    startTransition(async () => {
      const result = await updateToolLinkReportStatus(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result?.success || 'Rapor güncellendi.');
      router.refresh();
    });
  };

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{tool?.name || `Araç #${report.tool_id}`}</h3>
            <Badge className={getReportStatusBadgeClass(report.status)}>
              {linkReportStatusLabels[report.status] || report.status}
            </Badge>
            <Badge variant="secondary">
              {linkReportReasonLabels[report.reason] || report.reason}
            </Badge>
          </div>

          <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
              <dt className="sr-only">Rapor tarihi</dt>
              <dd>{formatReportDate(report.created_at)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
              <dt className="sr-only">Raporlayan</dt>
              <dd className="truncate">{report.reporter_email || 'E-posta yok'}</dd>
            </div>
          </dl>

          <div className="rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
            <p className="font-semibold text-foreground">Raporlanan bağlantı</p>
            <p className="mt-1 break-all">{report.reported_url}</p>
            {tool?.link && tool.link !== report.reported_url && (
              <p className="mt-2 break-all">Güncel araç linki: {tool.link}</p>
            )}
          </div>

          {report.details && (
            <p className="whitespace-pre-wrap rounded-lg border bg-background p-3 text-sm leading-6 text-muted-foreground">
              {report.details}
            </p>
          )}

          {report.admin_note && (
            <p className="rounded-lg bg-primary/5 p-3 text-sm leading-6 text-muted-foreground">
              <span className="font-semibold text-foreground">Admin notu: </span>
              {report.admin_note}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[260px] lg:justify-end">
          {tool?.slug && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/tool/${tool.slug}`} target="_blank" rel="noopener noreferrer">
                Canlı sayfa
                <ExternalLink aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
          {report.reported_url && (
            <Button asChild variant="outline" size="sm">
              <a href={report.reported_url} target="_blank" rel="noopener noreferrer">
                Linki aç
                <ExternalLink aria-hidden="true" className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <form
        action={handleAction}
        className="mt-4 grid gap-3 border-t pt-4 lg:grid-cols-[180px_minmax(0,1fr)_auto]"
      >
        <input type="hidden" name="reportId" value={report.id} />
        <select
          name="status"
          defaultValue={report.status || 'open'}
          disabled={isPending}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Rapor durumu"
        >
          <option value="open">Açık</option>
          <option value="reviewing">İncelemede</option>
          <option value="resolved">Çözüldü</option>
          <option value="dismissed">Geçersiz</option>
        </select>
        <Input
          name="adminNote"
          defaultValue={report.admin_note || ''}
          disabled={isPending}
          maxLength={1000}
          placeholder="Admin notu ekle..."
          aria-label="Admin notu"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Kaydediliyor…' : 'Güncelle'}
        </Button>
      </form>
    </article>
  );
}

function ReportedLinksTab({ reports }) {
  const t = useTranslations('AdminClient');
  const [statusFilter, setStatusFilter] = React.useState('active');
  const counts = React.useMemo(
    () => ({
      all: reports.length,
      active: reports.filter((report) => report.status === 'open' || report.status === 'reviewing')
        .length,
      open: reports.filter((report) => report.status === 'open').length,
      reviewing: reports.filter((report) => report.status === 'reviewing').length,
      resolved: reports.filter((report) => report.status === 'resolved').length,
      dismissed: reports.filter((report) => report.status === 'dismissed').length,
    }),
    [reports]
  );
  const filteredReports = reports.filter((report) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return report.status === 'open' || report.status === 'reviewing';
    return report.status === statusFilter;
  });

  return (
    <Card className="glass-panel border-border/50">
      <CardHeader>
        <CardTitle>{t('reportedLinksTitle')}</CardTitle>
        <CardDescription>
          Kullanıcıların araç detay sayfalarından gönderdiği hatalı link bildirimlerini inceleyin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['active', 'Aktif', counts.active],
            ['open', 'Açık', counts.open],
            ['reviewing', 'İncelemede', counts.reviewing],
            ['resolved', 'Çözüldü', counts.resolved],
            ['dismissed', 'Geçersiz', counts.dismissed],
            ['all', 'Tümü', counts.all],
          ].map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-xl border p-3 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                statusFilter === value ? 'bg-primary/10 text-primary' : 'bg-background'
              }`}
              aria-pressed={statusFilter === value}
            >
              <span className="block text-xs font-medium text-muted-foreground">{label}</span>
              <span className="mt-1 block text-xl font-bold">{count}</span>
            </button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground" role="status">
          {filteredReports.length} rapor gösteriliyor.
        </p>

        <div className="space-y-3">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => <LinkReportCard key={report.id} report={report} />)
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Bu filtrede link raporu bulunmuyor.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// YENİ: Sistem Uyarıları & Şikayetler Sekmesi
function AdminAlertsTab({ alerts }) {
  const t = useTranslations('AdminClient');
  const [statusFilter, setStatusFilter] = React.useState('Açık');
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();

  const handleAction = (action, successMsg) => {
    startTransition(async () => {
      const res = await action();
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(successMsg || res.success);
        router.refresh();
      }
    });
  };

  const filteredAlerts = alerts.filter((alert) => alert.status === statusFilter);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('alertsTitle')}</CardTitle>
        <CardDescription>
          Kullanıcılar tarafından raporlanan yorumları ve diğer sistem uyarılarını yönetin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {['Açık', 'İnceleniyor', 'Çözüldü', 'Kapatıldı'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              onClick={() => setStatusFilter(status)}
              size="sm"
            >
              {status}
            </Button>
          ))}
        </div>

        <div className="space-y-3 mt-4">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className="border p-4 rounded-lg flex flex-col gap-2 bg-card">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={alert.alert_type === 'reported_comment' ? 'destructive' : 'default'}
                  >
                    {alert.alert_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.created_at).toLocaleString('tr-TR')}
                  </span>
                </div>
                <p className="text-sm font-medium whitespace-pre-wrap">{alert.description}</p>
                {alert.metadata?.comment_id && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Yorum ID: {alert.metadata.comment_id}
                  </p>
                )}
                {statusFilter === 'Açık' || statusFilter === 'İnceleniyor' ? (
                  <div className="flex gap-2 mt-2">
                    {alert.alert_type === 'reported_comment' && alert.metadata?.comment_id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          handleAction(
                            () => deleteReportedComment(alert.id, alert.metadata.comment_id),
                            'Yorum silindi.'
                          )
                        }
                      >
                        Yorumu Sil
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleAction(() => dismissAlert(alert.id), 'Uyarı kapatıldı.')}
                    >
                      Uyarıyı Kapat (Geçersiz)
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-center p-8 text-sm text-muted-foreground border border-dashed rounded-lg">
              Bu filtrede uyarı bulunmuyor.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatKasifDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Europe/Istanbul',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function formatGoalLabel(goals, t, locale = 'tr') {
  if (!goals || goals === '(hedef yok)') return t('kasifGoalNone');
  return String(goals)
    .split(',')
    .map((part) => formatKasifGoalLabel(part.trim(), locale) || part.trim())
    .filter(Boolean)
    .join(', ');
}

function KasifQualityTab({ interactions = [] }) {
  const t = useTranslations('AdminClient');
  const router = useRouter();
  const locale = useLocale();
  const kasifHref = locale === 'en' ? '/en/kasif' : '/kasif';
  const stats = React.useMemo(
    () => buildKasifQualityStats(interactions, { windowDays: 30, sampleLimit: 12 }),
    [interactions]
  );
  const feedbackCoverage =
    stats.total > 0 ? Math.round((stats.withFeedback / stats.total) * 100) : null;

  function exportQualityJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      locale,
      windowDays: stats.windowDays,
      stats,
      sampleInteractions: (interactions || []).slice(0, 100).map((row) => ({
        id: row.id,
        question: row.question,
        confidence: row.confidence,
        feedback: row.feedback,
        goals: row.intent?.goals || [],
        meta: row.intent?.meta || null,
        pricePreference: row.intent?.pricePreference || null,
        sourceCount: Array.isArray(row.source_ids) ? row.source_ids.length : 0,
        created_at: row.created_at,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `kasif-quality-${stamp}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-border/50">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t('kasifQualityTitle')}</CardTitle>
            <CardDescription>{t('kasifQualityDesc', { days: stats.windowDays })}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="min-h-9">
              <Link href={kasifHref} prefetch={false}>
                {t('kasifOpenLive')}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9"
              onClick={exportQualityJson}
              disabled={!stats.total}
            >
              {t('kasifExportJson')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-9"
              onClick={() => router.refresh()}
            >
              {t('kasifRefresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.total === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{t('kasifEmptyTitle')}</p>
              <p className="mt-1">{t('kasifEmptyHint')}</p>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-xl border bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">{t('kasifStatTotal')}</p>
              <p className="mt-1 text-2xl font-bold">{stats.total}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('kasifFeedbackCoverage')}:{' '}
                {feedbackCoverage == null ? '—' : `%${feedbackCoverage}`}
              </p>
            </div>
            <div className="rounded-xl border bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">{t('kasifStatHelpful')}</p>
              <p className="mt-1 text-2xl font-bold">
                {stats.helpfulRate == null ? '—' : `%${stats.helpfulRate}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                +{stats.positive} / −{stats.negative}
              </p>
            </div>
            <div className="rounded-xl border bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">{t('kasifStatLowConf')}</p>
              <p className="mt-1 text-2xl font-bold">{stats.lowConfidence}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('kasifStatAvgConf')}:{' '}
                {stats.avgConfidence == null ? '—' : `%${Math.round(stats.avgConfidence * 100)}`}
              </p>
            </div>
            <div className="rounded-xl border bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">{t('kasifStatUngrounded')}</p>
              <p className="mt-1 text-2xl font-bold">{stats.ungrounded}</p>
            </div>
            <div className="rounded-xl border bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">{t('kasifStatMeta')}</p>
              <p className="mt-1 text-2xl font-bold">{stats.meta || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('kasifStatMetaHint')}</p>
            </div>
            <div className="rounded-xl border bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">{t('kasifStatSoftLanding')}</p>
              <p className="mt-1 text-2xl font-bold">{stats.softLanding || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('kasifStatSoftLandingHint')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t('kasifGoalsTitle')}</CardTitle>
            <CardDescription>{t('kasifGoalsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('kasifEmpty')}</p>
            ) : (
              stats.topGoals.map((bucket) => (
                <div
                  key={bucket.goals}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-medium">
                    {formatGoalLabel(bucket.goals, t, locale)}
                  </span>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{bucket.total}</Badge>
                    {bucket.negative > 0 && <Badge variant="destructive">−{bucket.negative}</Badge>}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t('kasifRulesTitle')}</CardTitle>
            <CardDescription>{t('kasifRulesDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.ruleCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('kasifRulesEmpty')}</p>
            ) : (
              stats.ruleCandidates.map((candidate) => (
                <div key={candidate.token} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-semibold">{candidate.token}</code>
                    <Badge variant="secondary">{candidate.count}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{candidate.suggestion}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t('kasifNegativeTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentNegative.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('kasifNegativeEmpty')}</p>
            ) : (
              stats.recentNegative.map((row) => (
                <article key={row.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium leading-5">{row.question}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    <span>{formatKasifDate(row.created_at)}</span>
                    <span>·</span>
                    <span>
                      {t('kasifConfidence')}: %{Math.round((row.confidence || 0) * 100)}
                    </span>
                    {row.goals?.length > 0 && (
                      <Badge variant="outline" className="font-normal">
                        {row.goals.map((goal) => formatKasifGoalLabel(goal, locale)).join(', ')}
                      </Badge>
                    )}
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t('kasifLowConfTitle')}</CardTitle>
            <CardDescription>{t('kasifLowConfDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentLowConfidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('kasifEmpty')}</p>
            ) : (
              stats.recentLowConfidence.map((row) => (
                <article key={row.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium leading-5">{row.question}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    <span>
                      {t('kasifConfidence')}: %{Math.round((row.confidence || 0) * 100)}
                    </span>
                    {row.goals?.length > 0 ? (
                      <Badge variant="outline" className="font-normal">
                        {row.goals.map((goal) => formatKasifGoalLabel(goal, locale)).join(', ')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="font-normal">
                        {t('kasifGoalNone')}
                      </Badge>
                    )}
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle className="text-base">{t('kasifSoftLandingTitle')}</CardTitle>
          <CardDescription>{t('kasifSoftLandingDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(stats.softLanding || 0) > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">
                {t('kasifSoftPriceFree')}: {stats.softLandingPriceBuckets?.free || 0}
              </Badge>
              <Badge variant="secondary">
                {t('kasifSoftPricePaid')}: {stats.softLandingPriceBuckets?.paid || 0}
              </Badge>
              <Badge variant="outline">
                {t('kasifSoftPriceAny')}: {stats.softLandingPriceBuckets?.any || 0}
              </Badge>
              {(stats.topSoftLandingTokens || []).slice(0, 5).map((item) => (
                <Badge key={item.token} variant="outline" className="font-mono font-normal">
                  {item.token} · {item.count}
                </Badge>
              ))}
            </div>
          ) : null}
          {(stats.recentSoftLanding || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('kasifSoftLandingEmpty')}</p>
          ) : (
            <div className="space-y-3">
              {stats.recentSoftLanding.map((row) => (
                <article key={row.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium leading-5">{row.question}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    <span>{formatKasifDate(row.created_at)}</span>
                    <span>·</span>
                    <span>
                      {t('kasifConfidence')}: %{Math.round((row.confidence || 0) * 100)}
                    </span>
                    {row.pricePreference && row.pricePreference !== 'any' && (
                      <Badge variant="outline" className="font-normal">
                        {row.pricePreference}
                      </Badge>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Ana Admin Paneli Bileşeni
export function AdminPageClient({ data }) {
  const t = useTranslations('AdminClient');
  const {
    unapprovedTools,
    unapprovedShowcaseItems,
    approvedTools,
    categories,
    allTags,
    allPosts,
    challenges,
    reportedLinks = [],
    adminAlerts = [],
    creatorApplications = [],
    kasifInteractions = [],
  } = data;

  const approvalCount = unapprovedTools.length + unapprovedShowcaseItems.length;
  const activeReportCount = reportedLinks.filter(
    (report) => report.status === 'open' || report.status === 'reviewing'
  ).length;
  const pendingReviewCount = (allPosts || []).filter((post) => post.status === 'İncelemede').length;
  const creatorAppCount = (creatorApplications || []).length;
  const contentBadgeCount = pendingReviewCount + creatorAppCount;
  const kasifIssueCount = (kasifInteractions || []).filter((row) =>
    isKasifIssueInteraction(row)
  ).length;

  return (
    <Tabs defaultValue="approval_queue" className="w-full">
      <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl p-1">
        <TabsTrigger value="approval_queue" className="shrink-0 text-xs sm:text-sm">
          {t('tabApproval')}{' '}
          <Badge variant={approvalCount > 0 ? 'default' : 'secondary'} className="ml-2">
            {approvalCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="tool_management">{t('tabTools')}</TabsTrigger>
        <TabsTrigger value="reported_links">
          {t('tabReports')}
          <Badge variant={activeReportCount > 0 ? 'default' : 'secondary'} className="ml-2">
            {activeReportCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="kasif_quality" className="shrink-0 text-xs sm:text-sm">
          {t('tabKasif')}
          <Badge variant={kasifIssueCount > 0 ? 'destructive' : 'secondary'} className="ml-2">
            {kasifIssueCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="admin_alerts">
          {t('tabAlerts')}
          <Badge
            variant={
              adminAlerts.filter((a) => a.status === 'Açık').length > 0
                ? 'destructive'
                : 'secondary'
            }
            className="ml-2"
          >
            {adminAlerts.filter((a) => a.status === 'Açık').length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="content_management">
          {t('tabContent')}
          <Badge variant={contentBadgeCount > 0 ? 'default' : 'secondary'} className="ml-2">
            {contentBadgeCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="platform_settings">{t('tabSettings')}</TabsTrigger>
      </TabsList>

      <TabsContent value="approval_queue" className="mt-6">
        <ApprovalQueueTab
          unapprovedTools={unapprovedTools}
          unapprovedShowcaseItems={unapprovedShowcaseItems}
          approvedTools={approvedTools}
          categories={categories}
          allTags={allTags}
        />
      </TabsContent>

      <TabsContent value="tool_management" className="mt-6">
        <ToolManagementTab
          approvedTools={approvedTools}
          categories={categories}
          allTags={allTags}
        />
      </TabsContent>

      <TabsContent value="reported_links" className="mt-6">
        <ReportedLinksTab reports={reportedLinks} />
      </TabsContent>

      <TabsContent value="kasif_quality" className="mt-6">
        <KasifQualityTab interactions={kasifInteractions} />
      </TabsContent>

      <TabsContent value="admin_alerts" className="mt-6">
        <AdminAlertsTab alerts={adminAlerts} />
      </TabsContent>

      <TabsContent value="content_management" className="mt-6 space-y-6">
        <AiToolFactory categories={categories} />
        <ChallengeManager challenges={challenges} />
        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {t('creatorAppsTitle')}
              <Badge variant={creatorAppCount > 0 ? 'default' : 'secondary'}>
                {creatorAppCount}
              </Badge>
            </CardTitle>
            <CardDescription>{t('creatorAppsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <CreatorApplicationsPanel applications={creatorApplications} />
          </CardContent>
        </Card>
        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {t('contentReviewTitle')}
              <Badge variant={pendingReviewCount > 0 ? 'default' : 'secondary'}>
                {pendingReviewCount}
              </Badge>
            </CardTitle>
            <CardDescription>{t('contentReviewDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ContentReviewQueue
              posts={(allPosts || []).filter((post) => post.status === 'İncelemede')}
            />
          </CardContent>
        </Card>
        <BlogManager posts={allPosts} />
        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" aria-hidden="true" />
              {t('newsletterTitle')}
            </CardTitle>
            <CardDescription>{t('newsletterDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <NewsletterManager />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="platform_settings" className="mt-6 space-y-6">
        <TagManager tags={allTags} />
        <CategoryManager categories={categories} />
      </TabsContent>
    </Tabs>
  );
}
