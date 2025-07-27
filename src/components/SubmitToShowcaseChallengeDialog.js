/*
* ---------------------------------------------------
* 1. YENİ BİLEŞEN: src/components/SubmitToShowcaseChallengeDialog.js
* Bu, kullanıcının eserlerini listeleyen ve yarışmaya göndermesini
* sağlayan interaktif penceredir.
* ---------------------------------------------------
*/
'use client'

import * as React from 'react'
import { useTransition } from 'react'
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { submitShowcaseToChallenge } from '@/app/actions'
import toast from 'react-hot-toast'
import { Trophy } from 'lucide-react'
import Image from 'next/image'

export function SubmitToShowcaseChallengeDialog({ userShowcaseItems, challengeTitle }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isPending, startTransition] = useTransition();
    const [selectedItemId, setSelectedItemId] = React.useState(null);
    const formRef = React.useRef(null);

    const handleFormAction = (formData) => {
        if (!selectedItemId) {
            toast.error("Lütfen yarışmaya göndermek için bir eser seçin.");
            return;
        }
        formData.append('showcaseItemId', selectedItemId);

        startTransition(async () => {
            const result = await submitShowcaseToChallenge(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(result.success);
                setIsOpen(false);
            }
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="lg">
                    <Trophy className="mr-2 h-5 w-5" />
                    Yarışmaya Eser Gönder
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yarışmaya Katıl: {challengeTitle}</DialogTitle>
                    <DialogDescription>
                        Yarışmaya göndermek istediğiniz, daha önce paylaştığınız bir eserinizi seçin.
                    </DialogDescription>
                </DialogHeader>
                {userShowcaseItems.length > 0 ? (
                    <form ref={formRef} action={handleFormAction} className="space-y-4 py-2">
                        <RadioGroup onValueChange={(value) => setSelectedItemId(value)} className="space-y-2 max-h-64 overflow-y-auto">
                            {userShowcaseItems.map(item => (
                                <Label 
                                    key={item.id}
                                    htmlFor={`item-${item.id}`}
                                    className="flex items-center gap-4 p-3 rounded-md border has-[:checked]:border-primary cursor-pointer"
                                >
                                    <RadioGroupItem value={item.id} id={`item-${item.id}`} />
                                    <Image src={item.image_url} alt={item.title} width={40} height={40} className="w-10 h-10 object-cover rounded-sm" />
                                    <p className="font-semibold">{item.title}</p>
                                </Label>
                            ))}
                        </RadioGroup>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>İptal</Button></DialogClose>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Gönderiliyor..." : "Seçili Eseri Gönder"}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Yarışmaya gönderebileceğiniz onaylanmış bir eseriniz bulunmuyor.</p>
                )}
            </DialogContent>
        </Dialog>
    )
}
