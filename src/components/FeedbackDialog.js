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
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { sendFeedback } from "@/app/actions";
import { MessageSquarePlus } from "lucide-react";

export function FeedbackDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = React.useRef(null);

  const handleFormAction = (formData) => {
    startTransition(async () => {
      const result = await sendFeedback(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Geri bildiriminiz için teşekkürler!");
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
          <div className="space-y-2">
            <Label htmlFor="email">E-posta adresiniz</Label>
            <input
              type="email"
              id="email"
              name="email"
              required
              disabled={isPending}
              placeholder="ornek@eposta.com"
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Mesajınız</Label>
            <Textarea
              id="feedback"
              name="feedback"
              required
              disabled={isPending}
              placeholder="Görüşünüzü veya yaşadığınız sorunu yazın..."
              className="min-h-[150px]"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                İptal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}