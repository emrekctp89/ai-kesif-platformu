'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationCenter } from './NotificationCenter';
import { UserNav } from './UserNav';
import { MobileNav } from './MobileNav';

// Bu, tüm interaktif navigasyon mantığını yöneten ana istemci bileşenidir.
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

  return (
    <>
      <MobileNav user={user} isProUser={isProUser} />

      {/* Ana Navigasyon Linkleri (Sol Taraf) */}
      <nav
        aria-label="Ana navigasyon"
        className="hidden md:flex items-center gap-6 text-sm font-medium"
      >
        <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
          {t('home')}
        </Link>
        <Link
          href="/kesfet"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('discover')}
        </Link>
        <Link
          href="/karsilastir"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('compare')}
        </Link>
        <Link
          href="/blog"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('blog')}
        </Link>
        <Link
          href="/eserler"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('showcase')}
        </Link>
      </nav>

      {/* Sağ Taraftaki Butonlar */}
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <div className="hidden items-center gap-2 sm:flex">
          <Button asChild className="ai-tavsiye-gradient font-semibold shadow-md">
            <Link href="/tavsiye" prefetch={false}>
              AI Tavsiye
            </Link>
          </Button>
          <Button asChild variant="secondary">
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
