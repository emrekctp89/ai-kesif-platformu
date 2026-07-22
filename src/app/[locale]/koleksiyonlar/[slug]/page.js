import { SoftLandingPage, softLandingMetadata } from '@/components/SoftLandingPage';

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const path = `/koleksiyonlar/${slug || ''}`;
  return softLandingMetadata({ featureKey: 'collections', path, locale });
}

export default async function KoleksiyonDetailSoftLandingPage({ params }) {
  const { slug } = await params;
  return <SoftLandingPage featureKey="collections" path={`/koleksiyonlar/${slug || ''}`} />;
}
