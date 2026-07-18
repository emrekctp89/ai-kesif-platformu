import { notFound } from 'next/navigation';
import KasifExperiment from './KasifExperiment';

export const metadata = { title: 'Kâşif Yerel AI Deneyi', robots: { index: false, follow: false } };

export default function KasifExperimentPage() {
  if (process.env.LOCAL_KASIF_ENABLED !== 'true') notFound();
  return <KasifExperiment />;
}
