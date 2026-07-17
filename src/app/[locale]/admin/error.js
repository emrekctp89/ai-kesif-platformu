'use client';

import { useTranslations } from 'next-intl';

import { RouteError } from '@/components/ui/RouteError';

export default function AdminError({ error, reset }) {
  const t = useTranslations('AdminOps');

  return (
    <RouteError error={error} reset={reset} title={t('errorTitle')} message={t('errorMessage')} />
  );
}
