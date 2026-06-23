"use client";

import * as React from "react";
import { useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { sendFeedback } from "@/app/actions";
import { LoaderCircle, MessageSquarePlus } from "lucide-react";

export function FeedbackDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [isPending, startTransition] = useTransition();
  const [messageLength, setMessageLength] = React.useState(0);
  const formRef = React.useRef(null);

  const handleFormAction = (formData) => {
    startTransition(async () => {
      const result = await sendFeedback(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Geri bildiriminiz için teşekkürler!");
        formRef.current?.reset();
        setMessageLength(0);
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setStartedAt(Date.now());
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="text-sm">
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          Geri Bildirim Gönder
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Geri Bildirim</DialogTitle>
          <DialogDescription>
            Platformla ilgili görüşlerinizi veya yaşadığınız sorunları bizimle paylaşın.
          </DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          action={handleFormAction}
          className="space-y-4 py-2"
        >
          <input type="hidden" name="started_at" value={startedAt} />
          <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
            <Label htmlFor="feedback-company-website">Şirket web sitesi</Label>
            <input
              id="feedback-company-website"
              name="company_website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-posta adresiniz</Label>
            <Input
              type="email"
              id="email"
              name="email"
              required
              disabled={isPending}
              placeholder="ornek@eposta.com"
              maxLength={254}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-type">Geri bildirim türü</Label>
            <select
              id="feedback-type"
              name="feedback_type"
              defaultValue="Genel"
              disabled={isPending}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="Genel">Genel görüş</option>
              <option value="Hata">Hata bildirimi</option>
              <option value="Öneri">Özellik önerisi</option>
              <option value="İçerik">İçerik düzeltmesi</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Mesajınız</Label>
            <Textarea
              id="feedback"
              name="feedback"
              required
              disabled={isPending}
              minLength={20}
              maxLength={2000}
              onChange={(event) => setMessageLength(event.target.value.length)}
              placeholder="Görüşünüzü veya yaşadığınız sorunu yazın..."
              className="min-h-[150px]"
              aria-describedby="feedback-message-help"
            />
            <div id="feedback-message-help" className="flex justify-between text-xs text-muted-foreground">
              <span>En az 20 karakter yazın.</span>
              <span>{messageLength}/2000</span>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                İptal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                  Gönderiliyor…
                </>
              ) : "Gönder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
