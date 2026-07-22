'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationCenter } from './NotificationCenter';
import { UserNav } from './UserNav';
import { MobileNav } from './MobileNav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { filterNavLinks } from '@/lib/navFeatures';
import { useCommunityPanelPref } from '@/hooks/useCommunityPanelPref';

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
  const { communityPanelEnabled } = useCommunityPanelPref();

  // Lean primary bar: promote Learn + Workmind; pause community / keşfet / eserler / rastgele.
  const primaryLinks = [
    { href: '/', label: t('home') },
    { href: '/kategori', label: t('categories') },
    { href: '/ogren', label: t('learn'), emphasize: true },
    { href: '/workmind', label: t('workmind'), emphasize: true },
    { href: '/blog', label: t('blog'), className: 'hidden lg:inline' },
    { href: '/arastirma', label: t('research'), className: 'hidden xl:inline' },
    { href: '/karsilastir', label: t('compare'), className: 'hidden xl:inline' },
  ];

  const moreExplore = filterNavLinks(
    [
      { href: '/kasif', label: t('kasif') },
      { href: '/tavsiye', label: t('aiRecommend') },
      { href: '/arastirma', label: t('research') },
      { href: '/bulten', label: t('newsletter') },
      // Paused for now — kept listed only if flags re-enabled in navFeatures:
      { href: '/kesfet', label: t('discover') },
      { href: '/random-tools', label: t('randomTools') },
    ],
    { allowCommunity: false }
  );

  // Collections stays public (not in COMMUNITY_PATHS); other community surfaces need the panel toggle.
  const moreCommunity = filterNavLinks(
    [
      { href: '/koleksiyonlar', label: t('collections') },
      ...(user ? [{ href: '/akis', label: t('feed') }] : []),
      { href: '/topluluk', label: t('community') },
      { href: '/leaderboard', label: t('leaderboard') },
      { href: '/eserler', label: t('showcase') },
      { href: '/launchpad', label: t('launchpad') },
      { href: '/yarisma', label: t('challenge') },
      { href: '/odul-avciligi', label: t('bounties') },
    ],
    { allowCommunity: Boolean(user && communityPanelEnabled) }
  );

  const morePlatform = [
    { href: '/developer', label: t('developer') },
    { href: '/uyelik', label: t('membership') },
    ...(user && isProUser ? [{ href: '/studyo', label: t('studio') }] : []),
    { href: '/feedback', label: t('feedback') },
    { href: '/hakkimizda', label: t('about') },
    { href: '/iletisim', label: t('contact') },
    { href: '/gizlilik', label: t('privacy') },
    { href: '/kullanim-kosullari', label: t('terms') },
  ];

  return (
    <>
      <MobileNav user={user} isProUser={isProUser} />

      <nav
        aria-label={t('mainNavAria')}
        className="hidden items-center gap-5 text-sm font-medium md:flex lg:gap-6"
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('more')}
              <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>{t('groupExplore')}</DropdownMenuLabel>
            {moreExplore.map((link) => (
              <DropdownMenuItem key={link.href} asChild>
                <Link href={link.href} prefetch={false}>
                  {link.label}
                </Link>
              </DropdownMenuItem>
            ))}
            {moreCommunity.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t('groupCommunity')}</DropdownMenuLabel>
                {moreCommunity.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href} prefetch={false}>
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('groupPlatform')}</DropdownMenuLabel>
            {morePlatform.map((link) => (
              <DropdownMenuItem key={link.href} asChild>
                <Link href={link.href} prefetch={false}>
                  {link.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <div className="hidden items-center gap-2 sm:flex">
          <Button asChild className="ai-tavsiye-gradient font-semibold shadow-md">
            <Link href="/tavsiye" prefetch={false}>
              {t('aiRecommend')}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/workmind" prefetch={false}>
              {t('workmind')}
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
