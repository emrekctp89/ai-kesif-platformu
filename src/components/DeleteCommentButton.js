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
import { deleteComment } from "@/app/actions"
import toast from 'react-hot-toast'

export function DeleteCommentButton({ commentId }) {

  const handleFormAction = async (formData) => {
    const result = await deleteComment(formData);
    if (result?.error) {
        toast.error(result.error);
    } else {
        toast.success("Yorum silindi.");
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {/* Daha kibar bir görünüm için küçük ve outline bir buton kullanıyoruz */}
        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          Sil
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Yorumu Silmek İstediğinize Emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem geri alınamaz. Yorumunuz kalıcı olarak silinecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="commentId" value={commentId} />
            <AlertDialogAction type="submit">
              Evet, Sil
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
