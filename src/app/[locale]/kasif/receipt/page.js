import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { JobReceiptPublicView } from '@/components/kasif/JobReceiptPublicView';
import { ReceiptSocialProofStrip } from '@/components/kasif/ReceiptSocialProofStrip';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Kasif' });
  return {
    title: t('job.receiptPageTitle'),
    description: t('job.receiptPageDesc'),
    robots: { index: false, follow: false },
  };
}

export default async function KasifReceiptPage({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  const id = String(query?.id || '').trim();
  const token = String(query?.t || query?.token || '').trim();
  const t = await getTranslations({ locale, namespace: 'Kasif' });
  const kasifHref = locale === 'en' ? '/en/kasif' : '/kasif';

  return (
    <main className="mx-auto min-h-[60vh] w-full max-w-xl px-4 py-10 sm:px-6">
      <div className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('job.receiptEyebrow')}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{t('job.receiptPageTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('job.receiptPageDesc')}</p>
      </div>

      <JobReceiptPublicView interactionId={id} feedbackToken={token} locale={locale} />

      <div className="mt-6">
        <ReceiptSocialProofStrip windowDays={30} />
      </div>

      <p className="mt-8 text-center text-sm">
        <Link
          href={kasifHref}
          prefetch={false}
          className="font-medium text-primary hover:underline"
        >
          {t('job.receiptBackToKasif')}
        </Link>
      </p>
    </main>
  );
}
