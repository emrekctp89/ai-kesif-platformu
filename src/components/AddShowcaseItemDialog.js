'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { PlusCircle } from 'lucide-react';

import { submitShowcaseItem } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

// DB values stay Turkish; labels are translated.
const CONTENT_TYPES = [
  { value: 'Görsel', labelKey: 'typeImage' },
  { value: 'Metin', labelKey: 'typeText' },
  { value: 'Kod', labelKey: 'typeCode' },
];

export function AddShowcaseItemDialog() {
  const t = useTranslations('ProfileComponents');
  const formRef = React.useRef(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const [contentType, setContentType] = React.useState('Görsel');

  const typeLabel =
    CONTENT_TYPES.find((item) => item.value === contentType)?.labelKey || 'typeImage';

  const handleFormAction = (formData) => {
    startTransition(async () => {
      const result = await submitShowcaseItem(formData);
      if (result?.success) {
        toast.success(result.success);
        formRef.current?.reset();
        setContentType('Görsel');
        setIsOpen(false);
      } else if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="brand-gradient min-h-9 shadow-md">
          <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('addShowcase')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t('addShowcaseTitle')}</DialogTitle>
          <DialogDescription>{t('addShowcaseDesc')}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleFormAction} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('showcaseTitleLabel')}</Label>
            <Input
              id="title"
              name="title"
              placeholder={t('showcaseTitlePlaceholder')}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('contentTypeLabel')}</Label>
            <RadioGroup
              defaultValue="Görsel"
              className="flex flex-wrap gap-4 pt-1"
              name="content_type"
              onValueChange={setContentType}
            >
              {CONTENT_TYPES.map((item, index) => (
                <div key={item.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={item.value} id={`content-type-${index}`} />
                  <Label htmlFor={`content-type-${index}`}>{t(item.labelKey)}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {contentType === 'Görsel' ? (
            <div className="space-y-2">
              <Label htmlFor="image">{t('imageFileLabel')}</Label>
              <Input
                id="image"
                name="image"
                type="file"
                required
                disabled={isPending}
                accept="image/*"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="content_text">{t('contentLabel', { type: t(typeLabel) })}</Label>
              <Textarea
                id="content_text"
                name="content_text"
                placeholder={t('contentPlaceholder')}
                required
                disabled={isPending}
                className="min-h-[200px] font-mono"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">{t('descriptionLabel')}</Label>
            <Textarea
              id="description"
              name="description"
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
              {isPending ? t('submitting') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
