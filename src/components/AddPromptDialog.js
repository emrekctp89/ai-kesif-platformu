'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { PlusCircle } from 'lucide-react';

import { submitPrompt } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export function AddPromptDialog({ toolId, toolSlug, onSuccess, triggerLabel }) {
  const t = useTranslations('ToolDetail');
  const formRef = React.useRef(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const buttonLabel = triggerLabel || t('promptShare');

  const handleFormSubmit = (formData) => {
    startTransition(async () => {
      const result = await submitPrompt(formData);
      if (result?.success) {
        toast.success(result.success);
        formRef.current?.reset();
        setIsOpen(false);
        onSuccess?.();
      } else if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('promptDialogTitle')}</DialogTitle>
          <DialogDescription>{t('promptDialogDesc')}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleFormSubmit} className="space-y-4 py-4">
          <input type="hidden" name="toolId" value={toolId} />
          <input type="hidden" name="toolSlug" value={toolSlug} />
          <div className="space-y-2">
            <Label htmlFor="title">{t('promptTitleLabel')}</Label>
            <Input
              id="title"
              name="title"
              placeholder={t('promptTitlePlaceholder')}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt_text">{t('promptTextLabel')}</Label>
            <Textarea
              id="prompt_text"
              name="prompt_text"
              placeholder={t('promptTextPlaceholder')}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">{t('promptNotesLabel')}</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder={t('promptNotesPlaceholder')}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                {t('promptCancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending} className="brand-gradient shadow-md">
              {isPending ? t('promptSubmitting') : t('promptSubmit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
