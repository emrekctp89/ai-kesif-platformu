'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('Navigation');
  const year = new Date().getFullYear();

  const footerLinks = [
    { href: '/kategori', label: t('categories') },
    { href: '/kesfet', label: t('discover') },
    { href: '/ogren', label: t('learn') },
    { href: '/topluluk', label: t('community') },
    { href: '/leaderboard', label: t('leaderboard') },
    { href: '/karsilastir', label: t('compare') },
    { href: '/tavsiye', label: t('aiRecommend') },
    { href: '/blog', label: t('blog') },
    { href: '/bulten', label: t('newsletter') },
    { href: '/eserler', label: t('showcase') },
    { href: '/koleksiyonlar', label: t('collections') },
    { href: '/random-tools', label: t('randomTools') },
    { href: '/submit', label: t('submitTool') },
    { href: '/developer', label: t('developer') },
    { href: '/hakkimizda', label: t('about') },
    { href: '/iletisim', label: t('contact') },
    { href: '/gizlilik', label: t('privacy') },
    { href: '/kullanim-kosullari', label: t('terms') },
  ];

  return (
    <footer className="mt-12 border-t border-border bg-card">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="text-center md:text-left">
            <Link href="/" className="mb-2 block text-xl font-bold tracking-tight text-foreground">
              AI Keşif
            </Link>
            <p className="mb-1 text-sm text-muted-foreground">
              © {year} AI Keşif Platformu. Tüm hakları saklıdır.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">by Emre KOCATEPE</p>
          </div>

          <nav
            aria-label="Alt menü"
            className="flex flex-wrap justify-center gap-x-5 gap-y-3 md:justify-end"
          >
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
