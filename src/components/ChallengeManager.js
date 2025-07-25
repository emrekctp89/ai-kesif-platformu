/*
* ---------------------------------------------------
* 1. YENİ BİLEŞEN: src/components/ChallengeManager.js
* Bu, yeni yarışmalar oluşturmanızı sağlayan yönetim panelidir.
* ---------------------------------------------------
*/
'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { createChallengeManually, generateChallengeIdeasWithAi } from '@/app/actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import toast from 'react-hot-toast'
import { Sparkles, PlusCircle } from 'lucide-react'

export function ChallengeManager() {
    const [isPending, startTransition] = useTransition();
    const [isAiPending, startAiTransition] = useTransition();
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [aiTopic, setAiTopic] = React.useState('');

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
                // Formu temizle
                setTitle('');
                setDescription('');
                setAiTopic('');
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Yarışma Yönetimi</CardTitle>
                <CardDescription>
                    Yeni bir haftalık yarışma oluşturun veya yapay zekadan fikir alın.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* AI Fikir Üretici */}
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                    <Label htmlFor="ai-topic">AI Fikir Asistanı</Label>
                    <div className="flex gap-2">
                        <Input 
                            id="ai-topic" 
                            placeholder="Bir konu girin (örn: 'Fantastik Canavarlar')"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                        />
                        <Button variant="outline" onClick={handleGenerateIdeas} disabled={isAiPending}>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {isAiPending ? '...' : 'Fikir Üret'}
                        </Button>
                    </div>
                </div>

                {/* Manuel Yarışma Formu */}
                <form action={handleFormSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Yarışma Başlığı *</Label>
                        <Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Açıklama</Label>
                        <Textarea id="description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Başlangıç Tarihi *</Label>
                            <Input id="start_date" name="start_date" type="date" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end_date">Bitiş Tarihi *</Label>
                            <Input id="end_date" name="end_date" type="date" required />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isPending}>
                            <PlusCircle className="w-4 h-4 mr-2" />
                            {isPending ? 'Oluşturuluyor...' : 'Yarışmayı Oluştur'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

