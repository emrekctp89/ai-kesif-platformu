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

export function DeleteToolButton({ toolId }) {
  const handleFormAction = async (formData) => {
    const result = await deleteTool(formData);
    if (result?.error) {
        toast.error(result.error);
    } else {
        toast.success("Araç başarıyla silindi.");
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">Sil</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
          {/* HATA BURADAYDI, DÜZELTİLDİ */}
          <AlertDialogDescription>
            Bu işlem geri alınamaz. Bu araç kalıcı olarak silinecek ve bu araca ait tüm veriler (puanlar, yorumlar, favoriler) kaybolacaktır.
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
