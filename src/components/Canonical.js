// components/Canonical.js
"use client";

import { usePathname } from "next/navigation";

export default function Canonical() {
  const pathname = usePathname();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

  return (
    <link rel="canonical" href={`${baseUrl}${pathname}`} />
  );
}
