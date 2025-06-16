"use client";

import * as React from "react";
import { useTransition, useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { previewNewsletter, sendNewsletter } from "@/app/actions";
import { WeeklyNewsletterEmail } from "@/components/emails/WeeklyNewsletterEmail"; // E-posta şablonunu import ediyoruz
import { render } from "@react-email/render"; // Render fonksiyonunu burada kullanacağız
import toast from "react-hot-toast";

export function NewsletterManager() {
  const [previewHtml, setPreviewHtml] = useState("");
  const [isPending, startTransition] = useTransition();

  const handlePreview = () => {
    startTransition(async () => {
      setPreviewHtml("");
      // 1. Sunucudan sadece ham veriyi istiyoruz
      const result = await previewNewsletter();

      // 2. Veri geldikten sonra, HTML'i tarayıcıda kendimiz oluşturuyoruz
      if (result.success && result.data) {
        const html = render(
          <WeeklyNewsletterEmail newsletterData={result.data} />
        );
        setPreviewHtml(html);
      } else if (result.error) {
        toast.error(result.error);
      } else {
        toast.error("Önizleme oluşturulurken bilinmeyen bir hata oluştu.");
      }
    });
  };

  const handleSend = () => {
    startTransition(async () => {
      const result = await sendNewsletter();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={handlePreview} disabled={isPending}>
          {isPending && !previewHtml
            ? "Oluşturuluyor..."
            : "Bülteni Oluştur ve Önizle"}
        </Button>

        {previewHtml && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isPending}>
                {isPending ? "..." : "Tüm Kullanıcılara Gönder"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu işlem geri alınamaz. Haftalık bülten, kayıtlı olan TÜM
                  kullanıcılara gönderilecektir.
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
