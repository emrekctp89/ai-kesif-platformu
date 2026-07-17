'use client';

import * as React from 'react';
import { useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { createCollection, deleteCollection } from '@/app/actions';

function DeleteCollectionButton({ collectionId }) {
  const t = useTranslations('ProfileComponents');

  const handleFormAction = async (formData) => {
    const result = await deleteCollection(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(t('collectionDeleted'));
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
          <AlertDialogDescription>{t('confirmDeleteCollection')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('dismiss')}</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="id" value={collectionId} />
            <AlertDialogAction type="submit">{t('confirmYesDelete')}</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CreateCollectionDialog() {
  const t = useTranslations('ProfileComponents');
  const formRef = React.useRef(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCreateCollection = (formData) => {
    startTransition(async () => {
      const result = await createCollection(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(t('collectionCreated'));
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="brand-gradient min-h-9 shadow-md">
          <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('newCollection')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('newCollectionTitle')}</DialogTitle>
          <DialogDescription>{t('newCollectionDesc')}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleCreateCollection} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-collection-title">{t('collectionTitleLabel')}</Label>
            <Input
              id="new-collection-title"
              name="title"
              placeholder={t('collectionTitlePlaceholder')}
              required
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                {t('cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('creating') : t('createAndEdit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CollectionManager({ collections }) {
  const t = useTranslations('ProfileComponents');

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CreateCollectionDialog />
      </div>

      <hr className="border-border" />

      <div>
        <h3 className="mb-3 text-lg font-medium">{t('collectionsMine')}</h3>
        <div className="space-y-2">
          {collections.length > 0 ? (
            collections.map((collection) => (
              <div
                key={collection.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-3 glass-panel"
              >
                <div className="min-w-0">
                  <p className="font-medium">{collection.title}</p>
                  <Badge variant={collection.is_public ? 'default' : 'secondary'} className="mt-1">
                    {collection.is_public ? t('public') : t('private')}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/profile/collections/${collection.id}/edit`} prefetch={false}>
                      {t('edit')}
                    </Link>
                  </Button>
                  <DeleteCollectionButton collectionId={collection.id} />
                </div>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('collectionsEmpty')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
