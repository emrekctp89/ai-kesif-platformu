/*
* ---------------------------------------------------
* 1. GÜNCELLENMİŞ BİLEŞEN: src/components/AdminPageClient.js
* Bu, tüm sekmeleri ve interaktif yönetim araçlarını yöneten
* nihai istemci bileşenidir.
* ---------------------------------------------------
*/
'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/alert-dialog"
import Image from 'next/image'
import {
  approveTool,
  approveShowcaseItem,
  rejectTool,
  runToolQualityAutomation,
} from '@/app/actions'
import { AiToolFactory } from './AiToolFactory'
import { BlogManager } from './BlogManager'
import { ChallengeManager } from './ChallengeManager'
import { TagManager } from './TagManager'
import { CategoryManager } from './CategoryManager'
import { FeaturedToggle } from './FeaturedToggle'
import { EditToolDialog } from './EditToolDialog'
import { DeleteToolButton } from './DeleteToolButton'
import toast from 'react-hot-toast'
import {
  CalendarDays,
  Check,
  ExternalLink,
  Mail,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import {
  getToolQualityIssues,
  isLikelyEnglishDescription,
  normalizeToolLink,
} from '@/lib/toolQuality'

function getQualityPriority(issues, duplicateNameCount, duplicateLinkCount) {
  if (duplicateLinkCount > 1) return 'high'
  if (issues.some((issue) => issue.key === 'english')) return 'high'
  if (duplicateNameCount > 1) return 'medium'
  if (issues.length >= 2) return 'medium'
  if (issues.length === 1) return 'low'
  return 'clean'
}

function getQualityPriorityMeta(priority) {
  const meta = {
    high: {
      label: 'Yüksek öncelik',
      className: 'bg-red-600 hover:bg-red-600',
    },
    medium: {
      label: 'Orta öncelik',
      className: 'bg-orange-600 hover:bg-orange-600',
    },
    low: {
      label: 'Düşük öncelik',
      className: 'bg-sky-600 hover:bg-sky-600',
    },
    clean: {
      label: 'Temiz',
      className: 'bg-emerald-600 hover:bg-emerald-600',
    },
  }

  return meta[priority] || meta.clean
}

function getQualityActionHint(issues, duplicateNameCount, duplicateLinkCount) {
  if (duplicateLinkCount > 1) {
    return 'Önce aynı bağlantıdaki kayıtları karşılaştır; en dolu kaydı koruyup diğerini sil veya birleştir.'
  }
  if (issues.some((issue) => issue.key === 'english')) {
    return 'Açıklamayı Türkçeleştir ve kullanıcı faydasını ilk cümlede netleştir.'
  }
  if (duplicateNameCount > 1) {
    return 'Aynı adlı kayıtları kontrol et; gerçekten farklı ürün değilse tek kayda indir.'
  }
  if (issues.some((issue) => issue.key === 'metadata')) {
    return 'Fiyat modeli ve platform bilgisini tamamla; filtre sonuçları daha isabetli olur.'
  }
  if (issues.some((issue) => issue.key === 'short')) {
    return 'Açıklamayı kullanım amacı, öne çıkan özellik ve hedef kullanıcıyla genişlet.'
  }

  return 'Kayıt iyi görünüyor; istersen öne çıkarma veya kategori doğruluğunu kontrol et.'
}

function getCanonicalScore(tool) {
  const descriptionLength = String(tool.description || '').trim().length
  let score = Math.min(descriptionLength, 300) / 30

  if (!isLikelyEnglishDescription(tool.description)) score += 5
  if (tool.pricing_model) score += 2
  if (Array.isArray(tool.platforms) && tool.platforms.length > 0) score += 2
  if (tool.tool_tags?.length > 0) score += 1
  if (tool.is_featured) score += 2

  try {
    const hostname = new URL(tool.link).hostname.replace(/^www\./, '')
    if (!hostname.endsWith('topai.tools')) score += 4
  } catch {
    score -= 5
  }

  return score
}

function PendingToolCard({ tool, categories, allTags, hasDuplicateLink }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const qualityWarnings = [
    !tool.description || tool.description.trim().length < 60 ? 'Açıklama kısa' : null,
    !tool.category_id ? 'Kategori eksik' : null,
    !tool.link ? 'Site bağlantısı eksik' : null,
    !tool.slug ? 'Slug eksik' : null,
    hasDuplicateLink ? 'Benzer bağlantı yayında' : null,
  ].filter(Boolean)

  const runAction = (action, successFallback) => {
    const formData = new FormData()
    formData.set('toolId', tool.id)

    startTransition(async () => {
      const result = await action(formData)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(result?.success || successFallback)
      router.refresh()
    })
  }

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{tool.name}</h3>
            <Badge variant="outline">
              {tool.categories?.name || 'Kategorisiz'}
            </Badge>
            {qualityWarnings.length === 0 && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                İncelemeye hazır
              </Badge>
            )}
          </div>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {tool.description || 'Açıklama girilmemiş.'}
          </p>

          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
              <dt className="sr-only">Gönderen</dt>
              <dd className="truncate">{tool.suggester_email || 'Bilinmiyor'}</dd>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
              <dt className="sr-only">Gönderim tarihi</dt>
              <dd>
                {tool.created_at
                  ? new Intl.DateTimeFormat('tr-TR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Europe/Istanbul',
                    }).format(new Date(tool.created_at))
                  : 'Tarih bilinmiyor'}
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
                Siteyi aç
                <ExternalLink aria-hidden="true" className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
          <EditToolDialog tool={tool} categories={categories} allTags={allTags} />
          <Button
            size="sm"
            disabled={
              isPending ||
              qualityWarnings.includes('Site bağlantısı eksik') ||
              qualityWarnings.includes('Kategori eksik') ||
              qualityWarnings.includes('Slug eksik')
            }
            onClick={() => runAction(approveTool, 'Araç onaylandı.')}
          >
            <Check aria-hidden="true" className="mr-2 h-4 w-4" />
            {isPending ? 'İşleniyor…' : 'Onayla'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isPending}>
                <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
                Reddet
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{tool.name} önerisi reddedilsin mi?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu işlem bekleyen öneriyi kalıcı olarak siler ve geri alınamaz.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => runAction(rejectTool, 'Araç önerisi reddedildi.')}
                >
                  Evet, reddet
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </article>
  )
}

// "İçerik Onayı" Sekmesi
function ApprovalQueueTab({
  unapprovedTools,
  unapprovedShowcaseItems,
  approvedTools,
  categories,
  allTags,
}) {
    const approvedLinks = new Set(
      approvedTools.map((tool) => normalizeToolLink(tool.link))
    )
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                  <CardTitle>Onay Bekleyen Araçlar ({unapprovedTools.length})</CardTitle>
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
                  ) : ( <p className="text-muted-foreground text-center py-4">Onay bekleyen araç bulunmuyor.</p> )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Onay Bekleyen Eserler ({unapprovedShowcaseItems.length})</CardTitle></CardHeader>
                <CardContent>
                  {unapprovedShowcaseItems.length > 0 ? (
                      <div className="space-y-4">{unapprovedShowcaseItems.map((item) => ( <div key={item.id} className="bg-muted p-4 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div className="flex items-center gap-4"><Image src={item.image_url} alt={item.title} width={64} height={64} className="w-16 h-16 object-cover rounded-md flex-shrink-0" /><div><h3 className="font-semibold">{item.title}</h3><p className="text-sm text-muted-foreground">Gönderen: {item.profiles?.email || 'Bilinmiyor'}</p></div></div><form action={approveShowcaseItem}><input type="hidden" name="itemId" value={item.id} /><Button type="submit" className="w-full sm:w-auto">Onayla</Button></form></div>))}</div>
                  ) : ( <p className="text-muted-foreground text-center py-4">Onay bekleyen eser bulunmuyor.</p> )}
                </CardContent>
            </Card>
        </div>
    );
}

// YENİ: "Araç Yönetimi" Sekmesi
function ToolManagementTab({ approvedTools, categories, allTags }) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = React.useState('');
    const [qualityFilter, setQualityFilter] = React.useState('all');
    const [priorityFilter, setPriorityFilter] = React.useState('all');
    const [sortMode, setSortMode] = React.useState('issues');
    const [duplicateView, setDuplicateView] = React.useState('groups');
    const [isAutomationPending, startAutomationTransition] = React.useTransition()
    const [automationReport, setAutomationReport] = React.useState(null)
    const duplicateNames = React.useMemo(() => {
      const counts = new Map()
      approvedTools.forEach((tool) => {
        const key = String(tool.name || '').trim().toLocaleLowerCase('tr-TR')
        if (key) counts.set(key, (counts.get(key) || 0) + 1)
      })
      return counts
    }, [approvedTools])
    const duplicateLinks = React.useMemo(() => {
      const counts = new Map()
      approvedTools.forEach((tool) => {
        const key = normalizeToolLink(tool.link)
        if (key) counts.set(key, (counts.get(key) || 0) + 1)
      })
      return counts
    }, [approvedTools])
    const auditedTools = React.useMemo(
      () =>
        approvedTools.map((tool) => {
          const issues = getToolQualityIssues(tool, duplicateNames, duplicateLinks)
          const duplicateNameCount =
            duplicateNames.get(
              String(tool.name || '').trim().toLocaleLowerCase('tr-TR')
            ) || 0
          const duplicateLinkCount =
            duplicateLinks.get(normalizeToolLink(tool.link)) || 0
          const priority = getQualityPriority(
            issues,
            duplicateNameCount,
            duplicateLinkCount
          )

          return {
            tool,
            issues,
            duplicateNameCount,
            duplicateLinkCount,
            priority,
            actionHint: getQualityActionHint(
              issues,
              duplicateNameCount,
              duplicateLinkCount
            ),
          }
        }),
      [approvedTools, duplicateLinks, duplicateNames]
    )
    const qualityCounts = React.useMemo(
      () => ({
        all: auditedTools.length,
        duplicate: auditedTools.filter(({ issues }) =>
          issues.some((issue) => issue.key === 'duplicate')
        ).length,
        english: auditedTools.filter(({ issues }) =>
          issues.some((issue) => issue.key === 'english')
        ).length,
        short: auditedTools.filter(({ issues }) =>
          issues.some((issue) => issue.key === 'short')
        ).length,
        metadata: auditedTools.filter(({ issues }) =>
          issues.some((issue) => issue.key === 'metadata')
        ).length,
        high: auditedTools.filter(({ priority }) => priority === 'high').length,
        medium: auditedTools.filter(({ priority }) => priority === 'medium').length,
        low: auditedTools.filter(({ priority }) => priority === 'low').length,
        ready: auditedTools.filter(({ issues }) => issues.length === 0).length,
      }),
      [auditedTools]
    )
    const activeIssueCount = qualityCounts.all - qualityCounts.ready
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
    ]
    const priorityLabels = {
      all: 'tüm öncelikler',
      high: 'yüksek öncelik',
      medium: 'orta öncelik',
      low: 'düşük öncelik',
      clean: 'temiz kayıtlar',
    }
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('tr-TR')
    const filteredTools = auditedTools
      .filter(({ tool, issues, priority }) => {
        const matchesSearch =
          !normalizedSearch ||
          [tool.name, tool.description, tool.category_name, tool.link].some((value) =>
            String(value || '').toLocaleLowerCase('tr-TR').includes(normalizedSearch)
          )
        const matchesQuality =
          qualityFilter === 'all' ||
          (qualityFilter === 'ready'
            ? issues.length === 0
            : issues.some((issue) => issue.key === qualityFilter))
        const matchesPriority =
          priorityFilter === 'all' || priority === priorityFilter

        return matchesSearch && matchesQuality && matchesPriority
      })
      .sort((a, b) => {
        if (sortMode === 'name') {
          return String(a.tool.name || '').localeCompare(
            String(b.tool.name || ''),
            'tr'
          )
        }
        if (sortMode === 'newest') {
          return new Date(b.tool.created_at || 0) - new Date(a.tool.created_at || 0)
        }
        if (sortMode === 'oldest') {
          return new Date(a.tool.created_at || 0) - new Date(b.tool.created_at || 0)
        }

        const duplicateWeight = (entry) =>
          Math.max(entry.duplicateNameCount, entry.duplicateLinkCount) * 2
        const priorityWeight = { high: 30, medium: 20, low: 10, clean: 0 }
        return (
          (priorityWeight[b.priority] || 0) + b.issues.length + duplicateWeight(b) -
            ((priorityWeight[a.priority] || 0) + a.issues.length + duplicateWeight(a)) ||
          String(a.tool.name || '').localeCompare(String(b.tool.name || ''), 'tr')
        )
      });
    const duplicateGroups = React.useMemo(() => {
      const groups = new Map()

      auditedTools.forEach((entry) => {
        if (
          entry.duplicateNameCount <= 1 &&
          entry.duplicateLinkCount <= 1
        ) {
          return
        }

        const normalizedLink = normalizeToolLink(entry.tool.link)
        const normalizedName = String(entry.tool.name || '')
          .trim()
          .toLocaleLowerCase('tr-TR')
        const groupKey =
          entry.duplicateLinkCount > 1
            ? `link:${normalizedLink}`
            : `name:${normalizedName}`

        if (!groups.has(groupKey)) groups.set(groupKey, [])
        groups.get(groupKey).push(entry)
      })

      return Array.from(groups.entries())
        .map(([key, entries]) => {
          const sortedEntries = [...entries].sort(
            (a, b) =>
              getCanonicalScore(b.tool) - getCanonicalScore(a.tool) ||
              new Date(a.tool.created_at || 0) - new Date(b.tool.created_at || 0)
          )
          return {
            key,
            entries: sortedEntries,
            recommendedId: sortedEntries[0]?.tool.id,
          }
        })
        .filter(({ entries }) => entries.length > 1)
        .sort(
          (a, b) =>
            b.entries.length - a.entries.length ||
            String(a.entries[0]?.tool.name || '').localeCompare(
              String(b.entries[0]?.tool.name || ''),
              'tr'
            )
        )
    }, [auditedTools])
    const visibleDuplicateGroups = duplicateGroups.filter(({ entries }) =>
      entries.some(({ tool, priority }) =>
        (priorityFilter === 'all' || priority === priorityFilter) &&
        (!normalizedSearch ||
          [tool.name, tool.description, tool.category_name, tool.link].some(
            (value) =>
              String(value || '')
                .toLocaleLowerCase('tr-TR')
                .includes(normalizedSearch)
          ))
      )
    )
    const runAutomation = () => {
      startAutomationTransition(async () => {
        const result = await runToolQualityAutomation()
        if (result?.error) {
          toast.error(result.error)
          return
        }

        setAutomationReport(result)
        toast.success(
          `${result.updatedCount} kayıt otomatik güncellendi${
            result.failedCount > 0 ? `, ${result.failedCount} kayıt atlandı` : ""
          }.`
        )
        router.refresh()
      })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Onaylanmış Araçları Yönet</CardTitle>
                <CardDescription>
                  Veri kalitesi sorunlarını filtreleyin; araçları düzenleyin, silin veya öne çıkarın.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1.2fr_2fr]">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-sm font-semibold">Veri kalitesi kuyruğu</p>
                    <p className="mt-1 text-2xl font-bold">{activeIssueCount}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Düzeltme gerektiren kayıt; sorunsuz kayıt sayısı {qualityCounts.ready}.
                    </p>
                    <Button
                      className="mt-3"
                      size="sm"
                      onClick={runAutomation}
                      disabled={isAutomationPending}
                    >
                      {isAutomationPending
                        ? "Otomasyon çalışıyor..."
                        : "Akıllı düzeltmeyi çalıştır"}
                    </Button>
                    {automationReport && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Son çalışma: {automationReport.updatedCount} güncellendi,{" "}
                        {automationReport.inferredPricingCount} fiyat modeli ve{" "}
                        {automationReport.defaultedPlatformCount} platform alanı otomatik dolduruldu.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge className="bg-red-600 hover:bg-red-600">
                        {qualityCounts.high} yüksek
                      </Badge>
                      <Badge className="bg-orange-600 hover:bg-orange-600">
                        {qualityCounts.medium} orta
                      </Badge>
                      <Badge className="bg-sky-600 hover:bg-sky-600">
                        {qualityCounts.low} düşük
                      </Badge>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {qualityPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setQualityFilter(preset.value)}
                        className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          qualityFilter === preset.value
                            ? preset.tone
                            : 'bg-background hover:bg-muted/50'
                        }`}
                        aria-pressed={qualityFilter === preset.value}
                      >
                        <span className="block text-xs font-medium text-muted-foreground">
                          {preset.label}
                        </span>
                        <span className="mt-1 block text-xl font-bold">
                          {preset.count}
                        </span>
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
                    <option value="short">Kısa açıklama ({qualityCounts.short})</option>
                    <option value="metadata">Eksik fiyat/platform ({qualityCounts.metadata})</option>
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
                  <Badge variant="secondary">{qualityCounts.short} kısa açıklama</Badge>
                  <Badge variant="secondary">{qualityCounts.metadata} eksik metadata</Badge>
                </div>

                {qualityFilter === 'duplicate' && (
                  <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {visibleDuplicateGroups.length} tekrar kümesi
                      </p>
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
                              <h3 className="font-semibold">
                                {group.entries[0].tool.name}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {group.entries.length} kayıt karşılaştırılıyor
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {group.key.startsWith('link:')
                                ? 'Aynı bağlantı'
                                : 'Aynı ad'}
                            </Badge>
                          </div>
                          <div className="grid gap-3 xl:grid-cols-2">
                            {group.entries.map(({ tool, issues }) => (
                              <article
                                key={tool.id}
                                className="rounded-lg border bg-background p-3"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">
                                    {tool.category_name || 'Kategorisiz'}
                                  </Badge>
                                  {tool.id === group.recommendedId && (
                                    <Badge className="bg-emerald-600 hover:bg-emerald-600">
                                      Korunması önerilen
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    #{tool.id}
                                  </span>
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
                                      <ExternalLink
                                        aria-hidden="true"
                                        className="ml-2 h-4 w-4"
                                      />
                                    </Link>
                                  </Button>
                                  <EditToolDialog
                                    tool={tool}
                                    categories={categories}
                                    allTags={allTags}
                                  />
                                  <DeleteToolButton
                                    toolId={tool.id}
                                    toolName={tool.name}
                                  />
                                </div>
                              </article>
                            ))}
                          </div>
                        </section>
                      ))
                      : filteredTools.map(({
                      tool,
                      issues,
                      duplicateNameCount,
                      duplicateLinkCount,
                      priority,
                      actionHint,
                    }) => (
                        <div key={tool.id} className="p-3 rounded-lg border flex flex-wrap justify-between items-start gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold">{tool.name}</h3>
                                <Badge variant="outline">{tool.category_name || 'Kategorisiz'}</Badge>
                                <Badge className={getQualityPriorityMeta(priority).className}>
                                  {getQualityPriorityMeta(priority).label}
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
                        </div>
                    ))}
                    {((qualityFilter === 'duplicate' &&
                      duplicateView === 'groups' &&
                      visibleDuplicateGroups.length === 0) ||
                      (!(qualityFilter === 'duplicate' &&
                        duplicateView === 'groups') &&
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

// Ana Admin Paneli Bileşeni
export function AdminPageClient({ data }) {
  const { 
      unapprovedTools, 
      unapprovedShowcaseItems, 
      approvedTools,
      categories, 
      allTags, 
      allPosts,
      challenges
  } = data;
  
  const approvalCount = unapprovedTools.length + unapprovedShowcaseItems.length;

  return (
    <Tabs defaultValue="approval_queue" className="w-full">
      <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto p-1">
        <TabsTrigger value="approval_queue" className="shrink-0 text-xs sm:text-sm">
            Onay Kuyruğu <Badge variant={approvalCount > 0 ? "default" : "secondary"} className="ml-2">{approvalCount}</Badge>
        </TabsTrigger>
        <TabsTrigger value="tool_management">Araç Yönetimi</TabsTrigger>
        <TabsTrigger value="content_management">İçerik Yönetimi</TabsTrigger>
        <TabsTrigger value="platform_settings">Platform Ayarları</TabsTrigger>
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
      
      <TabsContent value="content_management" className="mt-6 space-y-6">
        <AiToolFactory categories={categories} />
        <ChallengeManager challenges={challenges} />
        <BlogManager posts={allPosts} />
      </TabsContent>
      
      <TabsContent value="platform_settings" className="mt-6 space-y-6">
        <TagManager tags={allTags} />
        <CategoryManager categories={categories} />
      </TabsContent>
    </Tabs>
  );
}
