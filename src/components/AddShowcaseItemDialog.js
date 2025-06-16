"use client";

import * as React from "react";
import { useTransition } from "react";
import { submitShowcaseItem } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { PlusCircle } from "lucide-react";
import toast from "react-hot-toast";

export function AddShowcaseItemDialog() {
  const formRef = React.useRef(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const [contentType, setContentType] = React.useState("Görsel");

  const handleFormAction = (formData) => {
    startTransition(async () => {
      const result = await submitShowcaseItem(formData);
      if (result?.success) {
        toast.success(result.success);
        formRef.current?.reset();
        setIsOpen(false);
      } else if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Yeni Eser Paylaş
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Yeni Eser Paylaş</DialogTitle>
          <DialogDescription>
            Yapay zeka araçlarını kullanarak yarattığınız bir eseri toplulukla
            paylaşın.
          </DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          action={handleFormAction}
          className="space-y-4 py-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Eser Başlığı *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Örn: Fütüristik Şehir Konsepti"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>İçerik Türü *</Label>
            <RadioGroup
              defaultValue="Görsel"
              className="flex gap-4 pt-1"
              name="content_type"
              onValueChange={setContentType}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Görsel" id="r1" />
                <Label htmlFor="r1">Görsel</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Metin" id="r2" />
                <Label htmlFor="r2">Metin</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Kod" id="r3" />
                <Label htmlFor="r3">Kod</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Dinamik İçerik Alanı */}
          {contentType === "Görsel" ? (
            <div className="space-y-2">
              <Label htmlFor="image">Görsel Dosyası *</Label>
              <Input
                id="image"
                name="image"
                type="file"
                required={contentType === "Görsel"}
                disabled={isPending}
                accept="image/*"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="content_text">{contentType} İçeriği *</Label>
              <Textarea
                id="content_text"
                name="content_text"
                placeholder={`Paylaşmak istediğiniz ${contentType.toLowerCase()} içeriğini buraya yapıştırın...`}
                required={contentType !== "Görsel"}
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
              {isPending ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
