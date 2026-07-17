import { getTranslations } from 'next-intl/server';

import { generatePageMetadata } from '@/utils/seo';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ContactPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/iletisim' : '/iletisim',
  });
}

export default function ContactLayout({ children }) {
  return children;
}
