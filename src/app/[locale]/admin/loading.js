import { getTranslations } from 'next-intl/server';

import { LoadingSpinner } from '@/components/LoadingComponents';

export default async function AdminLoading() {
  let label = '…';
  try {
    const t = await getTranslations('AdminOps');
    label = t('loading');
  } catch {
    label = 'Admin…';
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}
