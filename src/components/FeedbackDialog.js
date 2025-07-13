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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sendFeedback } from "@/app/actions";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
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
        {/* Animasyonlu, kayan buton */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden whitespace-nowrap"
        >
          <Button
            variant="ghost"
            className="h-full text-xs p-2 bg-primary/10 hover:bg-primary/20 text-primary"
          >
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Geri Bildirim Gönder
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin'e mesaj Gönder</DialogTitle>
          <DialogDescription>
            Platformu geliştirmemize yardımcı olacak bir sorun, istek veya
            fikrinizi bizimle paylaşın.
          </DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          action={handleFormAction}
          className="space-y-4 py-2"
        >
          <div className="space-y-2">
            <Label htmlFor="feedback-content">Mesajınız</Label>
            <Textarea
              id="feedback-content"
              name="feedback"
              placeholder="Karşılaştığınız bir sorunu veya platformda görmek istediğiniz bir özelliği anlatın..."
              required
              disabled={isPending}
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
