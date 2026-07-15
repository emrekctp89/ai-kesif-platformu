import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, Search, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Sayfa Bulunamadı - 404',
  description: 'Aradığınız sayfa bulunamadı. Ana sayfaya dönün veya keşfet sayfasını ziyaret edin.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full" />
            <AlertTriangle className="relative w-20 h-20 text-destructive" />
          </div>
        </div>

        {/* Status Code */}
        <div>
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <p className="text-xl font-semibold text-muted-foreground mt-2">Sayfa Bulunamadı</p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Aradığınız sayfa silinmiş, taşınmış veya hiç var olmamış olabilir.
          </p>
          <p className="text-sm text-muted-foreground">
            URL&apos;i kontrol ettikten sonra yeniden deneyin veya aşağıdaki seçeneklerden birini
            kullanın.
          </p>
        </div>

        {/* Suggestions */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left text-sm">
          <p className="font-semibold text-foreground">Deneyebileceğiniz şeyler:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>✓ URL'de yazım hatası olup olmadığını kontrol edin</li>
            <li>✓ Ana sayfaya geri dönüp arama yapın</li>
            <li>✓ Keşfet sayfasından araçları inceleyin</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button asChild variant="default" className="gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              Ana Sayfa
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/kesfet">
              <Search className="w-4 h-4" />
              Keşfet
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground pt-4 border-t">
          Yardıma ihtiyacınız mı var?{' '}
          <Link href="/iletisim" className="text-primary hover:underline">
            İletişim sayfasını
          </Link>{' '}
          ziyaret edin.
        </p>
      </div>
    </div>
  );
}
