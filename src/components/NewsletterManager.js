'use client';

import * as React from 'react';
import { useTransition, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { previewNewsletter, sendNewsletter } from '@/app/actions';
import toast from 'react-hot-toast';

export function NewsletterManager() {
  const [previewHtml, setPreviewHtml] = useState('');
  const [isPending, startTransition] = useTransition();

  const handlePreview = () => {
    startTransition(async () => {
      setPreviewHtml('');
      const result = await previewNewsletter();

      if (result.success && result.html) {
        setPreviewHtml(result.html);
      } else if (result.error) {
        toast.error(result.error);
      } else {
        toast.error('Önizleme oluşturulurken bilinmeyen bir hata oluştu.');
      }
    });
  };

  const handleSend = () => {
    startTransition(async () => {
      const result = await sendNewsletter();
      if (result.error) {
        toast.error(result.error);
      } else {
        const archiveNote = result.slug ? ` Arşiv: /bulten/${result.slug}` : '';
        toast.success(`${result.success}${archiveNote}`);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={handlePreview} disabled={isPending}>
          {isPending && !previewHtml ? 'Oluşturuluyor...' : 'Bülteni Oluştur ve Önizle'}
        </Button>

        {previewHtml && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isPending}>
                {isPending ? '...' : 'Tüm Kullanıcılara Gönder'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu işlem geri alınamaz. Haftalık bülten, kayıtlı olan TÜM kullanıcılara
                  gönderilecektir.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction onClick={handleSend} disabled={isPending}>
                  Evet, Gönder
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {previewHtml && (
        <Card>
          <CardContent className="p-2">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[600px] border-none rounded-md bg-white"
              title="Bülten Önizlemesi"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
