'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { updateChallenge } from '@/app/actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import toast from 'react-hot-toast'

export function ChallengeEditor({ challenge }) {
    const [isPending, startTransition] = useTransition();

    const handleFormSubmit = (formData) => {
        startTransition(async () => {
            const result = await updateChallenge(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(result.success);
            }
        });
    };

    return (
        <Card>
            <CardContent className="p-6">
                <form action={handleFormSubmit} className="space-y-4">
                    <input type="hidden" name="id" value={challenge.id} />
                    <div className="space-y-2"><Label htmlFor="title">Başlık *</Label><Input id="title" name="title" defaultValue={challenge.title} required /></div>
                    <div className="space-y-2"><Label htmlFor="description">Açıklama</Label><Textarea id="description" name="description" defaultValue={challenge.description} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="start_date">Başlangıç *</Label><Input id="start_date" name="start_date" type="date" defaultValue={challenge.start_date} required /></div>
                        <div className="space-y-2"><Label htmlFor="end_date">Bitiş *</Label><Input id="end_date" name="end_date" type="date" defaultValue={challenge.end_date} required /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="status">Durum *</Label><select name="status" id="status" defaultValue={challenge.status} required className="w-full mt-1 block pl-3 pr-10 py-2.5 text-base border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"><option>Aktif</option><option>Değerlendiriliyor</option><option>Tamamlandı</option></select></div>
                    <div className="flex justify-end"><Button type="submit" disabled={isPending}>{isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</Button></div>
                </form>
            </CardContent>
        </Card>
    )
}
