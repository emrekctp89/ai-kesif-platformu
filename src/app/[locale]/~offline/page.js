import { WifiOff } from 'lucide-react';
import { OfflineRecovery } from '@/components/OfflineRecovery';

export const metadata = {
  title: 'Çevrimdışı (Offline) | AI Keşif Platformu',
  description: 'Şu anda internet bağlantınız yok.',
};

export default async function OfflinePage({ params }) {
  const { locale } = await params;
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-muted/50 p-6 rounded-full mb-6">
        <WifiOff className="w-12 h-12 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">Bağlantı Yok</h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        Görünüşe göre internet bağlantınız kesildi. Uygulamayı kullanmaya devam etmek için lütfen
        bağlantınızı kontrol edin.
      </p>
      <OfflineRecovery homeHref={locale === 'en' ? '/en' : '/'} />
    </div>
  );
}
