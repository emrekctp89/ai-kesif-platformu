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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Image from 'next/image'
import { approveTool, approveShowcaseItem } from '@/app/actions'
import { AiToolFactory } from './AiToolFactory'
import { BlogManager } from './BlogManager'
import { ChallengeManager } from './ChallengeManager'
import { TagManager } from './TagManager'
import { CategoryManager } from './CategoryManager'
import { FeaturedToggle } from './FeaturedToggle'
import { EditToolDialog } from './EditToolDialog'
import { DeleteToolButton } from './DeleteToolButton'

// "İçerik Onayı" Sekmesi
function ApprovalQueueTab({ unapprovedTools, unapprovedShowcaseItems }) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Onay Bekleyen Araçlar ({unapprovedTools.length})</CardTitle></CardHeader>
                <CardContent>
                  {unapprovedTools.length > 0 ? (
                      <div className="space-y-4">{unapprovedTools.map((tool) => ( <div key={tool.id} className="bg-muted p-4 rounded-lg flex justify-between items-center"><div><h3 className="font-semibold">{tool.name}</h3><p className="text-sm text-muted-foreground">{tool.suggester_email}</p><a href={tool.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">Siteyi Görüntüle</a></div><form action={approveTool}><input type="hidden" name="toolId" value={tool.id} /><Button type="submit">Onayla</Button></form></div>))}</div>
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
    const filteredTools = approvedTools.filter(tool => 
        tool.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Onaylanmış Araçları Yönet</CardTitle>
                <CardDescription>Mevcut araçları düzenleyin, silin veya öne çıkarın.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Input 
                    placeholder="Bir aracı isme göre ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {filteredTools.map((tool) => (
                        <div key={tool.id} className="p-3 rounded-lg border flex flex-wrap justify-between items-center gap-4">
                            <h3 className="font-semibold">{tool.name}</h3>
                            <div className="flex items-center gap-2">
                              <FeaturedToggle toolId={tool.id} isFeatured={tool.is_featured} />
                              <EditToolDialog tool={tool} categories={categories} allTags={allTags} />
                              <DeleteToolButton toolId={tool.id} />
                            </div>
                        </div>
                    ))}
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