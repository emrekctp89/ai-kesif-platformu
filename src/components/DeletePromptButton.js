'use client';

import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';

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
import { deletePrompt } from '@/app/actions';

export function DeletePromptButton({ promptId, toolSlug }) {
  const t = useTranslations('ProfileComponents');

  const handleFormAction = async (formData) => {
    const result = await deletePrompt(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(t('promptDeleted'));
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
          aria-label={t('delete')}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('confirmDeletePrompt')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('dismiss')}</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="promptId" value={promptId} />
            <input type="hidden" name="toolSlug" value={toolSlug} />
            <AlertDialogAction type="submit">{t('confirmYesDelete')}</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
