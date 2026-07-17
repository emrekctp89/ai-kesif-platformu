'use client';

import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { CreditCard, LoaderCircle } from 'lucide-react';

import { createBillingPortalSession } from '@/app/actions';
import { Button } from '@/components/ui/button';

function PortalSubmitButton() {
  const t = useTranslations('MembershipPage');
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" className="min-h-11 glass-button" disabled={pending}>
      {pending ? (
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {pending ? t('billingPending') : t('ctaManageBilling')}
    </Button>
  );
}

export function ManageBillingButton() {
  return (
    <form action={createBillingPortalSession}>
      <PortalSubmitButton />
    </form>
  );
}
