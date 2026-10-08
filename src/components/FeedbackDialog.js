'use client';

import * as React from 'react';
import { useTransition } from 'react';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { sendFeedback } from '@/app/actions';
import { LoaderCircle, MessageSquarePlus } from 'lucide-react';

export function FeedbackDialog() {
  const t = useTranslations('Feedback');
  const [isOpen, setIsOpen] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [isPending, startTransition] = useTransition();
  const [messageLength, setMessageLength] = React.useState(0);
  const formRef = React.useRef(null);

  const handleFormAction = (formData) => {
    startTransition(async () => {
      const result = await sendFeedback(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(t('successToast'));
        formRef.current?.reset();
        setMessageLength(0);
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setStartedAt(Date.now());
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="text-sm">
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          {t('triggerButton')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleFormAction} className="space-y-4 py-2">
          <input type="hidden" name="started_at" value={startedAt} />
          <div
            className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
            aria-hidden="true"
          >
            <Label htmlFor="feedback-company-website">{t('companyWebsite')}</Label>
            <input
              id="feedback-company-website"
              name="company_website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('emailLabel')}</Label>
            <Input
              type="email"
              id="email"
              name="email"
              required
              disabled={isPending}
              placeholder={t('emailPlaceholder')}
              maxLength={254}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-type">{t('typeLabel')}</Label>
            <select
              id="feedback-type"
              name="feedback_type"
              defaultValue="Genel"
              disabled={isPending}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="Genel">{t('typeGeneral')}</option>
              <option value="Hata">{t('typeBug')}</option>
              <option value="Öneri">{t('typeSuggestion')}</option>
              <option value="İçerik">{t('typeContent')}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">{t('messageLabel')}</Label>
            <Textarea
              id="feedback"
              name="feedback"
              required
              disabled={isPending}
              minLength={20}
              maxLength={2000}
              onChange={(event) => setMessageLength(event.target.value.length)}
              placeholder={t('messagePlaceholder')}
              className="min-h-[150px]"
              aria-describedby="feedback-message-help"
            />
            <div
              id="feedback-message-help"
              className="flex justify-between text-xs text-muted-foreground"
            >
              <span>{t('messageHelp')}</span>
              <span>{t('messageCount', { count: messageLength })}</span>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                {t('cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                  {t('submitting')}
                </>
              ) : (
                t('submit')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
