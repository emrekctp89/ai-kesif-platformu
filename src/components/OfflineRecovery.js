'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineRecovery({ homeHref = '/' }) {
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
        {online
          ? 'Bağlantı geri geldi. Yeniden deneyebilirsiniz.'
          : 'İnternet bağlantısı bekleniyor…'}
      </p>
      <Button size="lg" disabled={!online} onClick={() => window.location.assign(homeHref)}>
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        Yeniden Dene
      </Button>
    </div>
  );
}
