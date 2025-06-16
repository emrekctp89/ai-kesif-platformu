"use client";

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
import { deletePrompt } from "@/app/actions";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

export function DeletePromptButton({ promptId, toolSlug }) {
  const handleFormAction = async (formData) => {
    const result = await deletePrompt(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Prompt silindi.");
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem geri alınamaz. Bu prompt kalıcı olarak silinecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="promptId" value={promptId} />
            {/* toolSlug, silme sonrası sayfa yenileme için gerekli */}
            <input type="hidden" name="toolSlug" value={toolSlug} />
            <AlertDialogAction type="submit">Evet, Sil</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
