import { SoftLandingPage, softLandingMetadata } from '@/components/SoftLandingPage';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return softLandingMetadata({ featureKey: 'community', path: '/topluluk', locale });
}

export default function ToplulukSoftLandingPage() {
  return <SoftLandingPage featureKey="community" path="/topluluk" />;
}
