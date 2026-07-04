import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SearchX, PackageOpen, FileQuestion, AlertCircle, Home } from 'lucide-react';

/**
 * EmptyState — Veri bulunamadığında veya yüklenemediğinde gösterilen fallback bileşeni.
 *
 * @param {"no-results" | "no-data" | "error" | "not-found"} variant - Görünüm varyantı
 * @param {string} title - Başlık metni
 * @param {string} description - Açıklama metni
 * @param {React.ReactNode} icon - Özel ikon (opsiyonel, variant'a göre otomatik seçilir)
 * @param {object} action - Aksiyon butonu { label, href, onClick }
 * @param {string} className - Ek CSS sınıfları
 */

const VARIANT_CONFIG = {
  'no-results': {
    icon: SearchX,
    defaultTitle: 'Sonuç bulunamadı',
    defaultDescription:
      'Arama kriterlerinize uygun sonuç bulunamadı. Filtreleri değiştirmeyi deneyin.',
    iconClassName: 'text-muted-foreground',
    bgClassName: 'bg-muted/50',
  },
  'no-data': {
    icon: PackageOpen,
    defaultTitle: 'Henüz içerik yok',
    defaultDescription: 'Bu alanda henüz içerik bulunmuyor.',
    iconClassName: 'text-muted-foreground',
    bgClassName: 'bg-muted/50',
  },
  error: {
    icon: AlertCircle,
    defaultTitle: 'Bir sorun oluştu',
    defaultDescription:
      'Veriler yüklenirken bir hata meydana geldi. Lütfen daha sonra tekrar deneyin.',
    iconClassName: 'text-destructive',
    bgClassName: 'bg-destructive/10',
  },
  'not-found': {
    icon: FileQuestion,
    defaultTitle: 'Sayfa bulunamadı',
    defaultDescription: 'Aradığınız içerik mevcut değil veya taşınmış olabilir.',
    iconClassName: 'text-muted-foreground',
    bgClassName: 'bg-muted/50',
  },
};

export default function EmptyState({
  variant = 'no-results',
  title,
  description,
  icon: CustomIcon,
  action,
  className,
}) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG['no-results'];
  const Icon = CustomIcon || config.icon;

  return (
    <div
      className={cn('flex flex-col items-center justify-center px-4 py-16 text-center', className)}
    >
      <div className={cn('mb-5 rounded-full p-4', config.bgClassName)}>
        <Icon className={cn('h-8 w-8', config.iconClassName)} />
      </div>

      <h3 className="text-lg font-semibold text-foreground">{title || config.defaultTitle}</h3>

      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description || config.defaultDescription}
      </p>

      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button asChild variant={action.variant || 'default'}>
              <Link href={action.href}>
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </Link>
            </Button>
          ) : (
            <Button onClick={action.onClick} variant={action.variant || 'default'}>
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          )}
        </div>
      )}

      {!action && variant !== 'error' && (
        <Button asChild variant="ghost" className="mt-6">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Ana Sayfa
          </Link>
        </Button>
      )}
    </div>
  );
}
