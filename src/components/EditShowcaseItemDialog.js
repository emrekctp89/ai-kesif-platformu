'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateShowcaseItem } from '@/app/actions';

const TYPE_LABEL_KEYS = {
  Görsel: 'typeImage',
  Metin: 'typeText',
  Kod: 'typeCode',
};

export function EditShowcaseItemDialog({ item }) {
  const t = useTranslations('ProfileComponents');
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();

  const typeLabelKey = TYPE_LABEL_KEYS[item.content_type] || 'typeText';

  const handleFormAction = (formData) => {
    startTransition(async () => {
      const result = await updateShowcaseItem(formData);
      if (result?.success) {
        toast.success(result.success);
        setIsOpen(false);
      } else if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('edit')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editShowcase')}</DialogTitle>
          <DialogDescription>{t('editShowcaseDesc', { title: item.title })}</DialogDescription>
        </DialogHeader>
        <form action={handleFormAction} className="space-y-4 py-4">
          <input type="hidden" name="itemId" value={item.id} />
          <div className="space-y-2">
            <Label htmlFor={`edit-title-${item.id}`}>{t('showcaseTitleLabel')}</Label>
            <Input
              id={`edit-title-${item.id}`}
              name="title"
              defaultValue={item.title}
              required
              disabled={isPending}
            />
          </div>

          {item.content_type !== 'Görsel' ? (
            <div className="space-y-2">
              <Label htmlFor={`edit-content-${item.id}`}>
                {t('contentLabel', { type: t(typeLabelKey) })}
              </Label>
              <Textarea
                id={`edit-content-${item.id}`}
                name="content_text"
                defaultValue={item.content_text}
                required
                disabled={isPending}
                className="min-h-[200px] font-mono"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`edit-description-${item.id}`}>{t('descriptionLabel')}</Label>
            <Textarea
              id={`edit-description-${item.id}`}
              name="description"
              defaultValue={item.description}
              placeholder={t('descriptionPlaceholder')}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                {t('cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending} className="brand-gradient shadow-md">
              {isPending ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
