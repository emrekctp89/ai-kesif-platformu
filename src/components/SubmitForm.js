'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { CheckCircle2, LoaderCircle, Send, ShieldCheck } from 'lucide-react';

import { submitTool } from '@/app/actions';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations('Submit');

  return (
    <Button type="submit" size="lg" className="min-h-12 w-full" disabled={pending}>
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />
          {t('submitting')}
        </>
      ) : (
        <>
          <Send aria-hidden="true" className="mr-2 h-5 w-5" />
          {t('submit')}
        </>
      )}
    </Button>
  );
}

export default function SubmitForm({ categories, user }) {
  const t = useTranslations('Submit');
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [startedAt] = useState(() => Date.now());

  return (
    <form action={submitTool} className="space-y-6 rounded-xl border bg-card p-5 shadow-sm sm:p-7">
      <input type="hidden" name="started_at" value={startedAt} />
      <div
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <Label htmlFor="company_website">{t('companyWebsite')}</Label>
        <Input
          id="company_website"
          name="company_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{t('nameLabel')}</Label>
          <Input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            placeholder={t('namePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link">{t('linkLabel')}</Label>
          <Input
            id="link"
            name="link"
            type="url"
            required
            maxLength={500}
            inputMode="url"
            autoComplete="url"
            placeholder={t('linkPlaceholder')}
            aria-describedby="link-help"
          />
          <p id="link-help" className="text-xs text-muted-foreground">
            {t('linkHelp')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="description">{t('descriptionLabel')}</Label>
          <span className="text-xs text-muted-foreground">
            {t('descriptionCount', { count: descriptionLength })}
          </span>
        </div>
        <Textarea
          id="description"
          name="description"
          required
          minLength={20}
          maxLength={600}
          onChange={(event) => setDescriptionLength(event.target.value.length)}
          placeholder={t('descriptionPlaceholder')}
          className="min-h-[130px] resize-y"
          aria-describedby="description-help"
        />
        <p id="description-help" className="text-xs text-muted-foreground">
          {t('descriptionHelp')}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category_id">{t('categoryLabel')}</Label>
        <select
          name="category_id"
          id="category_id"
          required
          defaultValue=""
          className="block min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="" disabled>
            {t('categoryPlaceholder')}
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {!user && (
        <div className="space-y-2 rounded-lg border bg-secondary/50 p-4">
          <Label htmlFor="suggester_email">{t('emailLabel')}</Label>
          <Input
            type="email"
            name="suggester_email"
            id="suggester_email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            aria-describedby="email-help"
          />
          <p
            id="email-help"
            className="flex items-start gap-2 pt-1 text-xs leading-5 text-muted-foreground"
          >
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {t('emailHelp')}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-600" />
          {t('beforeSubmitTitle')}
        </p>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
          <li>• {t('checklistWorking')}</li>
          <li>• {t('checklistUnique')}</li>
          <li>• {t('checklistReview')}</li>
        </ul>
      </div>

      <SubmitButton />
      <p className="text-center text-xs text-muted-foreground">{t('footerNote')}</p>
    </form>
  );
}
