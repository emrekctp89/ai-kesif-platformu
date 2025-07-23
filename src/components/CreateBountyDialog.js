/*
 * ---------------------------------------------------
 * 1. YENİ BİLEŞEN: src/components/CreateBountyDialog.js
 * Bu, yeni bir ödül ilanı oluşturma formunu içeren penceredir.
 * ---------------------------------------------------
 */
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
import { createBounty } from "@/app/actions";
import toast from "react-hot-toast";
import { PlusCircle } from "lucide-react";

export function CreateBountyDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = React.useRef(null);

  const handleFormAction = (formData) => {
    startTransition(async () => {
      const result = await createBounty(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Ödül İlanı Oluştur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Ödül İlanı</DialogTitle>
          <DialogDescription>
            Aradığınız ama bulamadığınız bir araç için topluluktan yardım
            isteyin.
          </DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          action={handleFormAction}
          className="space-y-4 py-2"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Aranan Araç (Başlık)</Label>
            <Input
              id="title"
              name="title"
              placeholder="Örn: YouTube videolarını özetleyen bir araç"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Detaylar</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="İhtiyacınızı ve aradığınız aracın özelliklerini detaylıca anlatın..."
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reward">Ödül (İtibar Puanı)</Label>
            <Input
              id="reward"
              name="reward"
              type="number"
              placeholder="100"
              required
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
              {isPending ? "Oluşturuluyor..." : "İlanı Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
