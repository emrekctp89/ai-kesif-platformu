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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateShowcaseItem } from "@/app/actions";
import toast from "react-hot-toast";

export function EditShowcaseItemDialog({ item }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFormAction = (formData) => {
    startTransition(async () => {
      const result = await updateShowcaseItem(formData);
      if (result?.success) {
        toast.success(result.success);
        setIsOpen(false);
      } else if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Düzenle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eseri Düzenle</DialogTitle>
          <DialogDescription>
            "{item.title}" başlıklı eserin detaylarını güncelleyin.
          </DialogDescription>
        </DialogHeader>
        <form action={handleFormAction} className="space-y-4 py-4">
          <input type="hidden" name="itemId" value={item.id} />
          <div className="space-y-2">
            <Label htmlFor="title">Eser Başlığı *</Label>
            <Input
              id="title"
              name="title"
              defaultValue={item.title}
              required
              disabled={isPending}
            />
          </div>

          {/* Sadece Metin veya Kod ise içerik düzenlenebilir */}
          {item.content_type !== "Görsel" && (
            <div className="space-y-2">
              <Label htmlFor="content_text">
                {item.content_type} İçeriği *
              </Label>
              <Textarea
                id="content_text"
                name="content_text"
                defaultValue={item.content_text}
                required
                disabled={isPending}
                className="min-h-[200px] font-mono"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={item.description}
              placeholder="Bu eseri nasıl ve hangi araçlarla yarattığınızı anlatın..."
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                İptal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
