'use client';

import * as React from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { LoaderCircle, Sparkles, Tag } from 'lucide-react';

import { createCheckoutSession } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function normalizePromoCode(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toUpperCase();
}

function UpgradeSubmitButton() {
  const t = useTranslations('MembershipPage');
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="brand-gradient min-h-12 w-full text-base shadow-md"
      size="lg"
      disabled={pending}
    >
      {pending ? (
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {pending ? t('upgradePending') : t('upgradeCta')}
    </Button>
  );
}

export function ProUpgradeForm({
  priceId,
  unitAmount,
  currency = 'TRY',
  initialPromoCode = '',
  isLoggedIn = true,
}) {
  const t = useTranslations('MembershipPage');
  const locale = useLocale();
  const [promoCode, setPromoCode] = React.useState(normalizePromoCode(initialPromoCode));

  const formatPrice = (amount) =>
    (amount / 100).toLocaleString(locale === 'en' ? 'en-US' : 'tr-TR', {
      style: 'currency',
      currency: currency || 'TRY',
      maximumFractionDigits: 0,
    });

  if (!isLoggedIn) {
    return (
      <div className="w-full space-y-3">
        <p className="text-sm text-muted-foreground">{t('loginToUpgradeHint')}</p>
        <Button asChild className="brand-gradient min-h-12 w-full text-base shadow-md" size="lg">
          <Link
            href={`/login?message=${encodeURIComponent(t('loginRequired'))}&next=/uyelik`}
            prefetch={false}
          >
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('loginToUpgrade')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={createCheckoutSession} className="w-full space-y-4">
      <input type="hidden" name="priceId" value={priceId} />
      <input type="hidden" name="promoCode" value={promoCode} />

      <div className="space-y-2">
        <Label htmlFor="promoCode" className="text-sm font-medium">
          {t('promoLabel')}
        </Label>
        <div className="relative">
          <Tag
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="promoCode"
            name="promoCodeDisplay"
            value={promoCode}
            onChange={(event) => setPromoCode(normalizePromoCode(event.target.value))}
            placeholder={t('promoPlaceholder')}
            className="min-h-11 pl-9 uppercase"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {promoCode ? <p className="text-xs text-muted-foreground">{t('promoHint')}</p> : null}
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5 text-sm">
        <span className="font-semibold">
          {t('priceSummary', { price: formatPrice(unitAmount) })}
        </span>
      </div>

      <UpgradeSubmitButton />
    </form>
  );
}
