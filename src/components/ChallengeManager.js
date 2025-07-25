'use client'

import * as React from 'react'
import { useTransition } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createChallengeManually, generateChallengeIdeasWithAi } from '@/app/actions'
import toast from 'react-hot-toast'
import { Sparkles, PlusCircle } from 'lucide-react'

// DÜZELTME: Eksik olan CreateChallengeDialog bileşenini buraya ekliyoruz.
function CreateChallengeDialog() {
    const [isPending, startTransition] = useTransition();
    const [isAiPending, startAiTransition] = useTransition();
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [aiTopic, setAiTopic] = React.useState('');
    const [isOpen, setIsOpen] = React.useState(false);

    const handleGenerateIdeas = () => {
        startAiTransition(async () => {
            const result = await generateChallengeIdeasWithAi(aiTopic);
            if (result.error) {
                toast.error(result.error);
            } else {
                setTitle(result.data.title);
                setDescription(result.data.description);
                toast.success("Yeni fikirler üretildi!");
            }
        });
    };

    const handleFormSubmit = (formData) => {
        startTransition(async () => {
            const result = await createChallengeManually(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(result.success);
                setIsOpen(false); // Pencereyi kapat
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Yeni Yarışma Oluştur
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yeni Yarışma Oluştur</DialogTitle>
                    <DialogDescription>
                        Yeni bir haftalık yarışma oluşturun veya yapay zekadan fikir alın.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                        <Label htmlFor="ai-topic">AI Fikir Asistanı</Label>
                        <div className="flex gap-2">
                            <Input id="ai-topic" placeholder="Bir konu girin (örn: 'Fantastik Canavarlar')" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} />
                            <Button variant="outline" onClick={handleGenerateIdeas} disabled={isAiPending}>
                                <Sparkles className="w-4 h-4 mr-2" />
                                {isAiPending ? '...' : 'Fikir Üret'}
                            </Button>
                        </div>
                    </div>
                    <form action={handleFormSubmit} className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="title">Yarışma Başlığı *</Label><Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="description">Açıklama</Label><Textarea id="description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="start_date">Başlangıç Tarihi *</Label><Input id="start_date" name="start_date" type="date" required /></div>
                            <div className="space-y-2"><Label htmlFor="end_date">Bitiş Tarihi *</Label><Input id="end_date" name="end_date" type="date" required /></div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>İptal</Button></DialogClose>
                            <Button type="submit" disabled={isPending}><PlusCircle className="w-4 h-4 mr-2" />{isPending ? 'Oluşturuluyor...' : 'Yarışmayı Oluştur'}</Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}


// Ana Yarışma Yönetim Bileşeni
export function ChallengeManager({ challenges }) {
  return (
    <Card>
        <CardHeader>
            <CardTitle>Yarışma Yönetimi</CardTitle>
            <CardDescription>Yeni bir haftalık yarışma oluşturun veya mevcutları yönetin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex justify-end">
                <CreateChallengeDialog />
            </div>
            <hr />
            <div className="space-y-2">
                <h3 className="text-lg font-medium">Mevcut Yarışmalar</h3>
                {challenges.map(c => (
                    <div key={c.id} className="p-3 rounded-lg border flex justify-between items-center">
                        <div>
                            <p className="font-medium">{c.title}</p>
                            <Badge>{c.status}</Badge>
                        </div>
                        <Button asChild variant="outline" size="sm"><Link href={`/admin/challenges/${c.id}/edit`}>Düzenle</Link></Button>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
  );
}
