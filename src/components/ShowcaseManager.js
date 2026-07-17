'use client';

import * as React from 'react';
import Image from 'next/image';
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
import { deleteShowcaseItem } from '@/app/actions';
import { AddShowcaseItemDialog } from './AddShowcaseItemDialog';
import { EditShowcaseItemDialog } from './EditShowcaseItemDialog';

function DeleteShowcaseItemButton({ item }) {
  const t = useTranslations('ProfileComponents');

  const handleFormAction = async (formData) => {
    const result = await deleteShowcaseItem(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(t('showcaseDeleted'));
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {t('delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('confirmDeleteShowcase', { title: item.title })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('dismiss')}</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="imageUrl" value={item.image_url} />
            <AlertDialogAction type="submit">{t('confirmYesDelete')}</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ShowcaseManager({ items }) {
  const t = useTranslations('ProfileComponents');

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AddShowcaseItemDialog />
      </div>
      <hr className="border-border" />
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-4 glass-panel"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      width={64}
                      height={64}
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.content_type}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.title}</p>
                  <p
                    className={`text-sm ${item.is_approved ? 'text-green-500' : 'text-yellow-500'}`}
                  >
                    {item.is_approved ? t('showcaseApproved') : t('showcasePending')}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <EditShowcaseItemDialog item={item} />
                <DeleteShowcaseItemButton item={item} />
              </div>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('showcaseEmpty')}</p>
        )}
      </div>
    </div>
  );
}
