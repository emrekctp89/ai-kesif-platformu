'use client';

import * as React from 'react';
import Link from 'next/link';
import { LoaderCircle, Mail, MessageSquareText, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { sendContactMessage } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ContactPage() {
  const t = useTranslations('ContactPage');
  const formRef = React.useRef(null);
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [isPending, startTransition] = React.useTransition();
  const [messageLength, setMessageLength] = React.useState(0);
  const [formMessage, setFormMessage] = React.useState(null);

  const handleFormAction = (formData) => {
    setFormMessage(null);
    startTransition(async () => {
      const result = await sendContactMessage(formData);

      if (result?.success) {
        setFormMessage({ type: 'success', text: result.success });
        formRef.current?.reset();
        setMessageLength(0);
        setStartedAt(Date.now());
      } else if (result?.error) {
        setFormMessage({ type: 'error', text: result.error });
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="glass-button mt-5 min-h-9 rounded-full"
          >
            <Link href="/feedback" prefetch={false}>
              <MessageSquareText className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('ctaFeedback')}
            </Link>
          </Button>
        </div>
      </section>

      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle>{t('formTitle')}</CardTitle>
          <CardDescription>{t('formDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={handleFormAction} className="space-y-6">
            <input type="hidden" name="started_at" value={startedAt} />
            <div
              className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
              aria-hidden="true"
            >
              <Label htmlFor="contact-company-website">{t('companyWebsite')}</Label>
              <Input
                id="contact-company-website"
                name="company_website"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('nameLabel')}</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t('namePlaceholder')}
                  minLength={2}
                  maxLength={100}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('emailLabel')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  maxLength={254}
                  autoComplete="email"
                  disabled={isPending}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">{t('messageLabel')}</Label>
              <Textarea
                id="message"
                name="message"
                placeholder={t('messagePlaceholder')}
                minLength={20}
                maxLength={2000}
                disabled={isPending}
                onChange={(event) => setMessageLength(event.target.value.length)}
                required
                className="min-h-[150px]"
                aria-describedby="contact-message-help"
              />
              <div
                id="contact-message-help"
                className="flex justify-between text-xs text-muted-foreground"
              >
                <span>{t('messageHelp')}</span>
                <span>{messageLength}/2000</span>
              </div>
            </div>

            {formMessage && (
              <div
                role={formMessage.type === 'error' ? 'alert' : 'status'}
                aria-live="polite"
                className={`rounded-md p-3 text-center text-sm ${
                  formMessage.type === 'success'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {formMessage.text}
              </div>
            )}

            <Button
              type="submit"
              className="brand-gradient w-full min-h-11 shadow-md"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                  {t('sending')}
                </>
              ) : (
                <>
                  <Send aria-hidden="true" className="mr-2 h-4 w-4" />
                  {t('send')}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
