'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

export function TopLoader() {
  const pathname = usePathname();

  useEffect(() => {
    NProgress.configure({ showSpinner: false });
    NProgress.start();
    NProgress.done();
  }, [pathname]);

  return null;
}
