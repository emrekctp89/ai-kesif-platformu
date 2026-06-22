'use client'

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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteTool } from "@/app/actions"
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export function DeleteToolButton({ toolId, toolName = "Bu araç" }) {
  const router = useRouter()
  const handleFormAction = async (formData) => {
    const result = await deleteTool(formData);
    if (result?.error) {
        toast.error(result.error);
    } else {
        toast.success(`${toolName} başarıyla silindi.`);
        router.refresh();
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">Sil</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{toolName} kalıcı olarak silinsin mi?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem geri alınamaz. <strong>{toolName}</strong> ve bu araca ait
            puanlar, yorumlar ve favoriler kalıcı olarak kaybolacaktır.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="toolId" value={toolId} />
            <AlertDialogAction type="submit">
              Evet, Sil
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
