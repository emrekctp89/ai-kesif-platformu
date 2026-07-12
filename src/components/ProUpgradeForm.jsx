'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Tag } from 'lucide-react';
import { createCheckoutSession } from '@/app/actions';

function normalizePromoCode(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toUpperCase();
}

export function ProUpgradeForm({ priceId, unitAmount, initialPromoCode = '' }) {
  const [promoCode, setPromoCode] = React.useState(normalizePromoCode(initialPromoCode));

  const formatPrice = (amount) =>
    (amount / 100).toLocaleString('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    });

  return (
    <form action={createCheckoutSession} className="w-full space-y-4">
      <input type="hidden" name="priceId" value={priceId} />
      <input type="hidden" name="promoCode" value={promoCode} />

      <div className="space-y-2">
        <Label htmlFor="promoCode" className="text-sm font-medium">
          Promo / Davet Kodu
        </Label>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="promoCode"
            name="promoCodeDisplay"
            value={promoCode}
            onChange={(event) => setPromoCode(normalizePromoCode(event.target.value))}
            placeholder="XXXX-XXXX"
            className="pl-9 uppercase"
            autoComplete="off"
          />
        </div>
        {promoCode && (
          <p className="text-xs text-muted-foreground">
            Kodunuz ödeme sayfası oluşturulurken güvenli şekilde doğrulanır.
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Pro üyelik: </span>
        <span className="font-semibold">{formatPrice(unitAmount)} / ay</span>
      </div>

      <Button type="submit" className="w-full" size="lg">
        <Sparkles className="w-4 h-4 mr-2" />
        Pro&apos;ya Şimdi Yükselt
      </Button>
    </form>
  );
}
