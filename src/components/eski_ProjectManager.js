"use client";

import * as React from "react";
import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createProject, deleteProject } from "@/app/actions";
import toast from "react-hot-toast";
import { PlusCircle } from "lucide-react";

// Proje Silme Butonu
function DeleteProjectButton({ projectId }) {
  const handleFormAction = async (formData) => {
    const result = await deleteProject(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Proje başarıyla silindi.");
      // Yönlendirme zaten action içinde yapılıyor.
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Sil
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem geri alınamaz. Bu proje ve içindeki tüm içerikler kalıcı
            olarak silinecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="id" value={projectId} />
            <AlertDialogAction type="submit">Evet, Sil</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Yeni Proje Oluşturma Penceresi
function CreateProjectDialog() {
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
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Proje Oluştur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Proje Oluştur</DialogTitle>
          <DialogDescription>
            Projenize akılda kalıcı bir başlık verin. Daha sonra içine araçlar
            ve diğer içerikleri ekleyebilirsiniz.
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

// Ana Proje Yönetim Bileşeni
export function ProjectManager({ projects }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CreateProjectDialog />
      </div>

      <hr className="border-border" />

      <div className="space-y-2">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project.id}
              className="p-3 rounded-lg border flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{project.title}</p>
                <p className="text-xs text-muted-foreground">
                  Son Güncelleme:{" "}
                  {new Date(
                    project.updated_at || project.created_at
                  ).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/profile/projects/${project.id}/edit`}>
                    Yönet
                  </Link>
                </Button>
                <DeleteProjectButton projectId={project.id} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Henüz hiç proje oluşturmadınız. Başlamak için "Yeni Proje Oluştur"
            butonuna tıklayın.
          </p>
        )}
      </div>
    </div>
  );
}
