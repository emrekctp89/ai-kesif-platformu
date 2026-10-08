import { WifiOff } from 'lucide-react';
import { OfflineRecovery } from '@/components/OfflineRecovery';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Offline' });
  return { title: t('metaTitle'), description: t('description') };
}

export default async function OfflinePage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Offline' });
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-muted/50 p-6 rounded-full mb-6">
        <WifiOff className="w-12 h-12 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">{t('title')}</h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">{t('description')}</p>
      <OfflineRecovery homeHref={locale === 'en' ? '/en' : '/'} />
    </div>
  );
}
