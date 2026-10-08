'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineRecovery({ homeHref = '/' }) {
  const t = useTranslations('Offline');
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    updateConnection();
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <p role="status" className="text-sm text-muted-foreground">
        {t(online ? 'connected' : 'waiting')}
      </p>
      <Button size="lg" disabled={!online} onClick={() => window.location.assign(homeHref)}>
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        {t('retry')}
      </Button>
    </div>
  );
}
