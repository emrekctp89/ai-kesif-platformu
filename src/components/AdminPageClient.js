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
import { approveTool, approveShowcaseItem, rejectTool } from '@/app/actions'
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

function normalizeToolLink(link) {
  try {
    const url = new URL(link)
    return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}`.toLowerCase()
  } catch {
    return String(link || '').trim().toLowerCase()
  }
}

function isLikelyEnglishDescription(description) {
  const text = String(description || '')
  const englishMatches =
    text.match(/\b(the|and|with|for|that|this|from|your|using|create|allows|users|tool|platform|powered)\b/gi) || []
  const turkishMatches =
    text.match(/[çğıöşü]|\b(ve|ile|için|bir|bu|yapay|zeka|araç|kullanıcı)\b/gi) || []

  return englishMatches.length >= 3 && englishMatches.length > turkishMatches.length * 1.5
}

function getToolQualityIssues(tool, duplicateNames, duplicateLinks) {
  const issues = []
  const description = String(tool.description || '').trim()
  const normalizedName = String(tool.name || '').trim().toLocaleLowerCase('tr-TR')
  const normalizedLink = normalizeToolLink(tool.link)

  if (description.length < 80) issues.push({ key: 'short', label: 'Kısa açıklama' })
  if (isLikelyEnglishDescription(description)) {
    issues.push({ key: 'english', label: 'İngilizce açıklama' })
  }
  if (!tool.pricing_model) issues.push({ key: 'metadata', label: 'Fiyat bilgisi yok' })
  if (!Array.isArray(tool.platforms) || tool.platforms.length === 0) {
    issues.push({ key: 'metadata', label: 'Platform bilgisi yok' })
  }
  if ((duplicateNames.get(normalizedName) || 0) > 1) {
    issues.push({ key: 'duplicate', label: 'Tekrarlanan ad' })
  }
  if (normalizedLink && (duplicateLinks.get(normalizedLink) || 0) > 1) {
    issues.push({ key: 'duplicate', label: 'Tekrarlanan bağlantı' })
  }

  return issues
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
    const [searchTerm, setSearchTerm] = React.useState('');
    const [qualityFilter, setQualityFilter] = React.useState('all');
    const [sortMode, setSortMode] = React.useState('issues');
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
        approvedTools.map((tool) => ({
          tool,
          issues: getToolQualityIssues(tool, duplicateNames, duplicateLinks),
          duplicateNameCount:
            duplicateNames.get(
              String(tool.name || '').trim().toLocaleLowerCase('tr-TR')
            ) || 0,
          duplicateLinkCount: duplicateLinks.get(normalizeToolLink(tool.link)) || 0,
        })),
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
        ready: auditedTools.filter(({ issues }) => issues.length === 0).length,
      }),
      [auditedTools]
    )
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('tr-TR')
    const filteredTools = auditedTools
      .filter(({ tool, issues }) => {
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

        return matchesSearch && matchesQuality
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
        return (
          b.issues.length + duplicateWeight(b) -
            (a.issues.length + duplicateWeight(a)) ||
          String(a.tool.name || '').localeCompare(String(b.tool.name || ''), 'tr')
        )
      });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Onaylanmış Araçları Yönet</CardTitle>
                <CardDescription>
                  Veri kalitesi sorunlarını filtreleyin; araçları düzenleyin, silin veya öne çıkarın.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_210px]">
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

                <p className="text-sm text-muted-foreground" role="status">
                  {filteredTools.length} araç gösteriliyor.
                </p>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {filteredTools.map(({
                      tool,
                      issues,
                      duplicateNameCount,
                      duplicateLinkCount,
                    }) => (
                        <div key={tool.id} className="p-3 rounded-lg border flex flex-wrap justify-between items-start gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold">{tool.name}</h3>
                                <Badge variant="outline">{tool.category_name || 'Kategorisiz'}</Badge>
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {tool.description || 'Açıklama yok.'}
                              </p>
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
                    {filteredTools.length === 0 && (
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
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="approval_queue">
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
