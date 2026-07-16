'use client';

import { usePathname } from 'next/navigation';
import { getSiteOrigin } from '@/utils/siteUrl';

export default function Canonical() {
  const pathname = usePathname();
  const canonicalUrl = new URL(pathname, `${getSiteOrigin().replace(/\/$/, '')}/`);

  return <link rel="canonical" href={canonicalUrl.toString()} />;
}
