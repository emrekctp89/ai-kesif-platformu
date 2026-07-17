'use client';

import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { deleteComment } from '@/app/actions';

export function DeleteCommentButton({ commentId }) {
  const t = useTranslations('ProfileComponents');

  const handleFormAction = async (formData) => {
    const result = await deleteComment(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(t('commentDeleted'));
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {t('delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('confirmDeleteComment')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('dismiss')}</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="commentId" value={commentId} />
            <AlertDialogAction type="submit">{t('confirmYesDelete')}</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
