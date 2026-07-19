import { SoftLandingPage, softLandingMetadata } from '@/components/SoftLandingPage';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return softLandingMetadata({ featureKey: 'showcase', path: '/eserler', locale });
}

export default function EserlerSoftLandingPage() {
  return <SoftLandingPage featureKey="showcase" path="/eserler" />;
}
