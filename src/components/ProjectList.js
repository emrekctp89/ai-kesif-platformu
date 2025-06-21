"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { deleteProject } from "@/app/actions";
import toast from "react-hot-toast";

function DeleteProjectButton({ projectId }) {
  const handleFormAction = async (formData) => {
    const result = await deleteProject(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Proje başarıyla silindi.");
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
            Bu işlem geri alınamaz. Bu proje kalıcı olarak silinecektir.
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

export function ProjectList({ projects }) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Henüz hiç proje oluşturmadınız.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
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
              <Link href={`/profile/projects/${project.id}/edit`}>Yönet</Link>
            </Button>
            <DeleteProjectButton projectId={project.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
