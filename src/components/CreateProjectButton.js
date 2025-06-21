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
import { createProject } from "@/app/actions";
import toast from "react-hot-toast";
import { PlusCircle } from "lucide-react";

export function CreateProjectButton() {
  const formRef = React.useRef(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCreateProject = (formData) => {
    startTransition(async () => {
      const result = await createProject(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(
          "Proje oluşturuldu, düzenleme sayfasına yönlendiriliyorsunuz..."
        );
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Proje Oluştur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Proje Oluştur</DialogTitle>
          <DialogDescription>
            Projenize akılda kalıcı bir başlık verin.
          </DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          action={handleCreateProject}
          className="space-y-4 py-2"
        >
          <div className="space-y-2">
            <Label htmlFor="new-project-title">Proje Başlığı</Label>
            <Input
              id="new-project-title"
              name="title"
              placeholder="Örn: Yeni E-ticaret Lansmanı"
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
              {isPending ? "Oluşturuluyor..." : "Oluştur & Düzenle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
