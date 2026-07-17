'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('Navigation');
  const year = new Date().getFullYear();

  const groups = [
    {
      title: t('groupExplore'),
      links: [
        { href: '/kategori', label: t('categories') },
        { href: '/kesfet', label: t('discover') },
        { href: '/karsilastir', label: t('compare') },
        { href: '/tavsiye', label: t('aiRecommend') },
        { href: '/random-tools', label: t('randomTools') },
        { href: '/koleksiyonlar', label: t('collections') },
        { href: '/arastirma', label: t('research') },
      ],
    },
    {
      title: t('groupCommunity'),
      links: [
        { href: '/topluluk', label: t('community') },
        { href: '/leaderboard', label: t('leaderboard') },
        { href: '/eserler', label: t('showcase') },
        { href: '/launchpad', label: t('launchpad') },
        { href: '/yarisma', label: t('challenge') },
        { href: '/odul-avciligi', label: t('bounties') },
        { href: '/akis', label: t('feed') },
      ],
    },
    {
      title: t('groupContent'),
      links: [
        { href: '/ogren', label: t('learn') },
        { href: '/blog', label: t('blog') },
        { href: '/bulten', label: t('newsletter') },
      ],
    },
    {
      title: t('groupPlatform'),
      links: [
        { href: '/submit', label: t('submitTool') },
        { href: '/developer', label: t('developer') },
        { href: '/uyelik', label: t('membership') },
        { href: '/studyo', label: t('studio') },
        { href: '/feedback', label: t('feedback') },
        { href: '/hakkimizda', label: t('about') },
        { href: '/iletisim', label: t('contact') },
        { href: '/gizlilik', label: t('privacy') },
        { href: '/kullanim-kosullari', label: t('terms') },
      ],
    },
  ];

  return (
    <footer className="mt-12 border-t border-border bg-card">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2.5fr)]">
          <div className="text-center lg:text-left">
            <Link href="/" className="mb-2 block text-xl font-bold tracking-tight text-foreground">
              AI Keşif
            </Link>
            <p className="mb-1 text-sm text-muted-foreground">
              © {year} AI Keşif Platformu. Tüm hakları saklıdır.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">by Emre KOCATEPE</p>
          </div>

          <nav aria-label={t('footerAria')} className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                  {group.title}
                </h2>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
