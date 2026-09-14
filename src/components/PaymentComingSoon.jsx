'use client';

import { useTranslations } from 'next-intl';
import { Clock3 } from 'lucide-react';

export function PaymentComingSoon({ promotion = false }) {
  const t = useTranslations('Payments');

  return (
    <div
      role="status"
      className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left sm:p-5"
    >
      <p className="flex items-center gap-2 font-semibold text-foreground">
        <Clock3 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        {t(promotion ? 'promotionTitle' : 'title')}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t(promotion ? 'promotionBody' : 'body')}
      </p>
    </div>
  );
}
