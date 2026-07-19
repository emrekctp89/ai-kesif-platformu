import { SoftLandingPage, softLandingMetadata } from '@/components/SoftLandingPage';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return softLandingMetadata({ featureKey: 'randomTools', path: '/random-tools', locale });
}

export default function RandomToolsSoftLandingPage() {
  return <SoftLandingPage featureKey="randomTools" path="/random-tools" />;
}
