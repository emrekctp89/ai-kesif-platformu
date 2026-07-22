import { SoftLandingPage, softLandingMetadata } from '@/components/SoftLandingPage';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return softLandingMetadata({ featureKey: 'collections', path: '/koleksiyonlar', locale });
}

export default function KoleksiyonlarSoftLandingPage() {
  return <SoftLandingPage featureKey="collections" path="/koleksiyonlar" />;
}
