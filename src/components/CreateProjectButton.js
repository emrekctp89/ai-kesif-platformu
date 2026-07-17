'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { PlusCircle } from 'lucide-react';

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
import { createProject } from '@/app/actions';

export function CreateProjectButton() {
  const t = useTranslations('ProfileComponents');
  const formRef = React.useRef(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCreateProject = (formData) => {
    startTransition(async () => {
      const result = await createProject(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(t('projectCreated'));
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="brand-gradient min-h-9 shadow-md">
          <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('newProject')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('newProjectTitle')}</DialogTitle>
          <DialogDescription>{t('newProjectDesc')}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleCreateProject} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-project-title">{t('projectTitleLabel')}</Label>
            <Input
              id="new-project-title"
              name="title"
              placeholder={t('projectTitlePlaceholder')}
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
