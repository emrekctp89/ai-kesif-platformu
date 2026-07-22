'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from './ui/badge';
import { Switch } from '@/components/ui/switch';
import { signOut } from '@/app/actions';
import {
  User,
  PlusCircle,
  LogOut,
  Sparkles,
  Crown,
  Database,
  Rss,
  LayoutGrid,
  Trophy,
  Users,
  Rocket,
  Target,
  WandSparkles,
  GraduationCap,
  BrainCircuit,
  Images,
  PenLine,
  FolderOpen,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCommunityPanelPref } from '@/hooks/useCommunityPanelPref';

export function UserNav({ user, profile, isProUser, isAdmin }) {
  const t = useTranslations('Navigation');
  const { communityPanelEnabled, setCommunityPanelEnabled } = useCommunityPanelPref();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-transparent transition-colors hover:border-primary">
            <AvatarImage src={profile?.avatar_url} alt={profile?.username || user.email} />
            <AvatarFallback>{user.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">{profile?.username || 'Kullanıcı'}</p>
              {isProUser && (
                <Badge variant="outline" className="border-purple-500 text-purple-500">
                  Pro
                </Badge>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="mr-2 h-4 w-4" />
            <span>{t('profileSettings')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/ogren">
            <GraduationCap className="mr-2 h-4 w-4" />
            <span>{t('learn')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/workmind">
            <BrainCircuit className="mr-2 h-4 w-4" />
            <span>{t('workmind')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/icerik">
            <PenLine className="mr-2 h-4 w-4" />
            <span>{t('contentStudio')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/kategori">
            <LayoutGrid className="mr-2 h-4 w-4" />
            <span>{t('categories')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/submit">
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>{t('submitTool')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/developer">
            <Sparkles className="mr-2 h-4 w-4" />
            <span>{t('developer')}</span>
          </Link>
        </DropdownMenuItem>

        {isProUser && (
          <DropdownMenuItem asChild>
            <Link href="/studyo">
              <WandSparkles className="mr-2 h-4 w-4 text-purple-500" />
              <span>{t('studio')}</span>
            </Link>
          </DropdownMenuItem>
        )}

        {!isProUser && !isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/uyelik">
              <Crown className="mr-2 h-4 w-4 text-purple-500" />
              <span>{t('upgradePro')}</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <div
          className="flex items-center justify-between gap-3 px-2 py-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium leading-none">{t('communityPanelToggle')}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {t('communityPanelToggleHint')}
            </p>
          </div>
          <Switch
            checked={communityPanelEnabled}
            onCheckedChange={setCommunityPanelEnabled}
            aria-label={t('communityPanelToggle')}
          />
        </div>

        {communityPanelEnabled && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('groupCommunity')}
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/koleksiyonlar">
                <FolderOpen className="mr-2 h-4 w-4" />
                <span>{t('collections')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/akis">
                <Rss className="mr-2 h-4 w-4" />
                <span>{t('feed')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/topluluk">
                <Users className="mr-2 h-4 w-4" />
                <span>{t('community')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/leaderboard">
                <Trophy className="mr-2 h-4 w-4" />
                <span>{t('leaderboard')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/eserler">
                <Images className="mr-2 h-4 w-4" />
                <span>{t('showcase')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/launchpad">
                <Rocket className="mr-2 h-4 w-4" />
                <span>{t('launchpad')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/odul-avciligi">
                <Target className="mr-2 h-4 w-4" />
                <span>{t('bounties')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/yarisma">
                <Trophy className="mr-2 h-4 w-4" />
                <span>{t('challenge')}</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <User className="mr-2 h-4 w-4 text-red-500" />
                <span className="font-medium text-red-500">Admin Paneli</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/bulk-import">
                <Database className="mr-2 h-4 w-4 text-orange-500" />
                <span className="font-medium text-orange-500">Toplu İçe Aktarım</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <form action={signOut} className="w-full">
          <DropdownMenuItem asChild>
            <button type="submit" className="flex w-full cursor-pointer items-center text-left">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('signOut')}</span>
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
