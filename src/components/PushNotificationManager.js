import logger from '@/utils/logger';
('use client');

import * as React from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { savePushSubscription, deletePushSubscription } from '@/app/actions';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager({ initialSubscriptionStatus }) {
  const t = useTranslations('ProfileComponents');
  const [isSubscribed, setIsSubscribed] = React.useState(Boolean(initialSubscriptionStatus));
  const [isPending, setIsPending] = React.useState(false);
  const [supported, setSupported] = React.useState(true);

  React.useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false);
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((swReg) => {
        swReg.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      })
      .catch((error) => {
        logger.error('Service Worker registration failed:', error);
      });
  }, []);

  const handleSubscriptionChange = async (isChecked) => {
    if (!supported) return;
    setIsPending(true);

    if (isChecked) {
      try {
        const swReg = await navigator.serviceWorker.ready;
        const subscription = await swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
        });

        const result = await savePushSubscription(subscription.toJSON());

        if (result.success) {
          toast.success(t('pushEnabled'));
          setIsSubscribed(true);
        } else {
          toast.error(result.error);
          setIsSubscribed(false);
        }
      } catch (error) {
        logger.error('Push subscription failed:', error);
        toast.error(t('pushPermissionError'));
        setIsSubscribed(false);
      }
    } else {
      try {
        const swReg = await navigator.serviceWorker.ready;
        const subscription = await swReg.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
        await deletePushSubscription();
        toast.success(t('pushDisabled'));
        setIsSubscribed(false);
      } catch (error) {
        logger.error('Push unsubscribe failed:', error);
        toast.error(t('pushPermissionError'));
      }
    }

    setIsPending(false);
  };

  if (!supported) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
      <Switch
        id="push-notifications"
        checked={isSubscribed}
        onCheckedChange={handleSubscriptionChange}
        disabled={isPending}
      />
      <Label htmlFor="push-notifications" className="cursor-pointer leading-snug">
        {t('pushLabel')}
      </Label>
    </div>
  );
}
