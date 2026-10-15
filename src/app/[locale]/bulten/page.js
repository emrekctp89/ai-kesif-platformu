import { redirect } from '@/i18n/routing';

export default async function BultenPage({ params }) {
  const { locale } = await params;
  redirect({ href: '/haberler', locale });
}
