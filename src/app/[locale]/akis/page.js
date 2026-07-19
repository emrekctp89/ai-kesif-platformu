import { SoftLandingPage, softLandingMetadata } from '@/components/SoftLandingPage';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return softLandingMetadata({ featureKey: 'feed', path: '/akis', locale });
}

export default function AkisSoftLandingPage() {
  return <SoftLandingPage featureKey="feed" path="/akis" />;
}
