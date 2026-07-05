'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { createPromotionCheckout } from '@/app/actions/payment';
import { Gem } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function PromoteToolButton({ toolId, toolSlug }) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const t = useTranslations('Tool');

  useEffect(() => {
    if (searchParams.get('promoted') === 'success') {
      toast.success('Ödeme başarılı! Araç 30 gün boyunca sponsorlu yapıldı.');
      // Remove query param from URL without refreshing
      window.history.replaceState({}, '', `/tool/${toolSlug}`);
    }
  }, [searchParams, toolSlug]);

  const handlePromote = async () => {
    setIsLoading(true);
    try {
      await createPromotionCheckout(toolId, toolSlug);
    } catch (error) {
      toast.error('Ödeme işlemi başlatılırken bir hata oluştu.');
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePromote}
      disabled={isLoading}
      variant="outline"
      className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 border-amber-500/30 font-semibold"
    >
      <Gem className="w-4 h-4 mr-2" />
      {isLoading ? '...' : t('promoteTool')}
    </Button>
  );
}
