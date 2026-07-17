'use client';

import * as React from 'react';
import { useTransition } from 'react';
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
import { PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function AddPromptDialog({ toolId, toolSlug, onSuccess, triggerLabel = 'Prompt paylaş' }) {
  const formRef = React.useRef(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();

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
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Yeni Bir Prompt Paylaş</DialogTitle>
          <DialogDescription>
            Bu araç için kullandığınız harika bir prompt'u toplulukla paylaşın.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleFormSubmit} className="space-y-4 py-4">
          <input type="hidden" name="toolId" value={toolId} />
          <input type="hidden" name="toolSlug" value={toolSlug} />
          <div className="space-y-2">
            <Label htmlFor="title">Prompt Başlığı</Label>
            <Input
              id="title"
              name="title"
              placeholder="Örn: Fotogerçekçi Portre"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt_text">Prompt Metni</Label>
            <Textarea
              id="prompt_text"
              name="prompt_text"
              placeholder="Prompt'un kendisini buraya yapıştırın..."
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Ek Notlar (İsteğe Bağlı)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Bu prompt'u kullanırken nelere dikkat edilmeli?"
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                İptal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
