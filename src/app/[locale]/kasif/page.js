import KasifExperiment from '../kasif-deney/KasifExperiment';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Kasif' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default function KasifPage() {
  return <KasifExperiment />;
}
