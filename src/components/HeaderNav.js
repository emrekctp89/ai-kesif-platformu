'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationCenter } from './NotificationCenter';
import { UserNav } from './UserNav';
import { MobileNav } from './MobileNav';
import { CommandPalette } from './CommandPalette';
import { SiteSearchIcon } from './SiteSearchIcon';

export function HeaderNav({
  user,
  isAdmin,
  isProUser,
  notifications,
  unreadCount,
  totalUnreadMessages,
  profile,
}) {
  const t = useTranslations('Navigation');
  const tc = useTranslations('Common');
  // Keep the desktop header focused on primary destinations. The logo already links home.
  const primaryLinks = [
    { href: '/kategori', label: t('categories') },
    { href: '/ogren', label: t('learn'), emphasize: true },
    { href: '/workmind', label: t('workmind'), emphasize: true },
    { href: '/blog', label: t('blog'), className: 'hidden lg:inline' },
    { href: '/haberler', label: t('news'), className: 'hidden lg:inline' },
    { href: '/developer', label: t('developer'), className: 'hidden lg:inline' },
    { href: '/uyelik', label: t('membership'), className: 'hidden lg:inline' },
  ];

  return (
    <>
      <MobileNav user={user} isProUser={isProUser} />

      <nav
        aria-label={t('mainNavAria')}
        className="hidden items-center gap-4 whitespace-nowrap text-sm font-medium md:flex xl:gap-5"
      >
        {primaryLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`transition-colors hover:text-foreground ${
              link.emphasize ? 'font-semibold text-foreground' : 'text-muted-foreground'
            } ${link.className || ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <CommandPalette />
        <div className="hidden items-center gap-2 sm:flex">
          <Button
            asChild
            variant="outline"
            className="bg-background/70 font-semibold shadow-sm backdrop-blur-sm hover:bg-accent"
          >
            <Link href="/kasif" prefetch={false} className="gap-2">
              <SiteSearchIcon className="h-5 w-5" />
              <span className="kasif-text-flow">{t('kasif')}</span>
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/submit" prefetch={false}>
              {t('addTool')}
            </Link>
          </Button>
          {!user && (
            <Button asChild variant="outline">
              <Link href="/login" prefetch={false}>
                {tc('login')}
              </Link>
            </Button>
          )}
          {user && !isProUser && !isAdmin && (
            <Button asChild variant="outline" className="border-purple-500/40 text-purple-600">
              <Link href="/uyelik" prefetch={false}>
                Pro
              </Link>
            </Button>
          )}
        </div>
        {user && (
          <NotificationCenter
            initialNotifications={notifications}
            unreadCount={unreadCount}
            user={user}
          />
        )}
        <LanguageSwitcher />
        <ThemeToggle />
        {user && <UserNav user={user} profile={profile} isProUser={isProUser} isAdmin={isAdmin} />}
      </div>
    </>
  );
}
