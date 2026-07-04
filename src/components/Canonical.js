// components/Canonical.js
'use client';

import { usePathname } from 'next/navigation';

export default function Canonical() {
  const pathname = usePathname();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aikeşif.com';
  const canonicalUrl = new URL(pathname, `${baseUrl.replace(/\/$/, '')}/`);

  return <link rel="canonical" href={canonicalUrl.toString()} />;
}
