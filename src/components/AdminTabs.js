'use client'

import * as React from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Image from 'next/image'
import { FeaturedToggle } from './FeaturedToggle'
import { EditToolDialog } from './EditToolDialog'
import { DeleteToolButton } from './DeleteToolButton'
import { approveTool, approveShowcaseItem, updateAdminAlertStatus } from '@/app/actions'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle, EyeOff } from 'lucide-react'

// "Uyarılar" Sekmesi
function AlertsTab({ alerts }) {
    const handleUpdateStatus = async (alertId, newStatus) => {
        const formData = new FormData();
        formData.append('alertId', alertId);
        formData.append('newStatus', newStatus);
        
        const result = await updateAdminAlertStatus(formData);
        if (result.error) toast.error(result.error);
        else toast.success(result.success);
    };

    return (
        <div className="space-y-4">
            {alerts.length > 0 ? alerts.map(alert => (
                <Card key={alert.id} className="bg-muted/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            {alert.alert_type.replace('_', ' ').toUpperCase()}
                        </CardTitle>
                        <CardDescription>{alert.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">İncele</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleUpdateStatus(alert.id, 'Yoksayıldı')}>
                            <EyeOff className="w-4 h-4 mr-2" /> Yoksay
                        </Button>
                        <Button size="sm" onClick={() => handleUpdateStatus(alert.id, 'Çözüldü')}>
                            <CheckCircle className="w-4 h-4 mr-2" /> Çözüldü
                        </Button>
                    </CardContent>
                </Card>
            )) : <p className="text-center text-muted-foreground py-8">Aktif uyarı bulunmuyor. Harika iş!</p>}
        </div>
    );
}

// "Araç Yönetimi" Sekmesi
function ToolManagementTab({ approvedTools, categories, allTags }) {
    const [searchTerm, setSearchTerm] = React.useState('');
    const filteredTools = approvedTools.filter(tool => 
        tool.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <Input 
                placeholder="Bir aracı isme göre ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="space-y-2">
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
        </div>
    );
}

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


// Ana Admin Paneli Bileşeni
export function AdminTabs({ data }) {
  const { alerts, unapprovedTools, unapprovedShowcaseItems, approvedTools, categories, allTags } = data;
  return (
    <Tabs defaultValue="alerts" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="alerts">
            Uyarılar <Badge variant={alerts.length > 0 ? "destructive" : "secondary"} className="ml-2">{alerts.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="tool_management">Araç Yönetimi</TabsTrigger>
        <TabsTrigger value="approval_queue">
            İçerik Onayı <Badge variant="secondary" className="ml-2">{unapprovedTools.length + unapprovedShowcaseItems.length}</Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="alerts" className="mt-6">
        <AlertsTab alerts={alerts} />
      </TabsContent>
      <TabsContent value="tool_management" className="mt-6">
        <ToolManagementTab approvedTools={approvedTools} categories={categories} allTags={allTags} />
      </TabsContent>
      <TabsContent value="approval_queue" className="mt-6">
        <ApprovalQueueTab unapprovedTools={unapprovedTools} unapprovedShowcaseItems={unapprovedShowcaseItems} />
      </TabsContent>
    </Tabs>
  );
}