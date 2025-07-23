/*
* ---------------------------------------------------
* GÜNCELLENMİŞ BİLEŞEN: src/components/PushNotificationManager.js
* ---------------------------------------------------
*/
'use client'

import * as React from 'react'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { savePushSubscription, deletePushSubscription } from '@/app/actions'
import toast from 'react-hot-toast'

// Tarayıcıdan gelen abonelik objesini VAPID anahtarıyla işleyen yardımcı fonksiyon
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager({ initialSubscriptionStatus }) {
    const [isSubscribed, setIsSubscribed] = React.useState(initialSubscriptionStatus);
    const [isPending, setIsPending] = React.useState(false);

    React.useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.register('/sw.js').then(swReg => {
                swReg.pushManager.getSubscription().then(subscription => {
                    setIsSubscribed(!!subscription);
                });
            }).catch(error => {
                console.error('Service Worker registration failed:', error);
            });
        }
    }, []);

    const handleSubscriptionChange = async (isChecked) => {
        setIsPending(true);
        if (isChecked) {
            const swReg = await navigator.serviceWorker.ready;
            try {
                const subscription = await swReg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
                });
                
                // DEĞİŞİKLİK: Sunucuya göndermeden önce, karmaşık objeyi
                // basit bir JSON objesine dönüştürüyoruz.
                const result = await savePushSubscription(subscription.toJSON());

                if (result.success) {
                    toast.success("Anlık bildirimler aktif edildi!");
                    setIsSubscribed(true);
                } else {
                    toast.error(result.error);
                }
            } catch (error) {
                console.error('Push subscription failed:', error);
                toast.error("Bildirimlere izin verilmedi veya bir hata oluştu.");
            }
        } else {
            const swReg = await navigator.serviceWorker.ready;
            const subscription = await swReg.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
            await deletePushSubscription();
            toast.success("Anlık bildirimler devre dışı bırakıldı.");
            setIsSubscribed(false);
        }
        setIsPending(false);
    };

    return (
        <div className="flex items-center space-x-2">
            <Switch
                id="push-notifications"
                checked={isSubscribed}
                onCheckedChange={handleSubscriptionChange}
                disabled={isPending}
            />
            <Label htmlFor="push-notifications">Anlık Bildirimlere İzin Ver</Label>
        </div>
    );
}
