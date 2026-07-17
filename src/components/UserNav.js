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
} from 'lucide-react';

// Bu bileşen, Header'dan gelen kullanıcı bilgilerini kullanarak menüyü oluşturur.
export function UserNav({ user, profile, isProUser, isAdmin }) {
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
      <DropdownMenuContent className="w-56" align="end" forceMount>
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
            <span>Profilim & Ayarlar</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/akis">
            <Rss className="mr-2 h-4 w-4" />
            <span>Akışım</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/kategori">
            <LayoutGrid className="mr-2 h-4 w-4" />
            <span>Kategoriler</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/topluluk">
            <Users className="mr-2 h-4 w-4" />
            <span>Topluluk</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/leaderboard">
            <Trophy className="mr-2 h-4 w-4" />
            <span>Liderlik</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/launchpad">
            <Rocket className="mr-2 h-4 w-4" />
            <span>Launchpad</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/odul-avciligi">
            <Target className="mr-2 h-4 w-4" />
            <span>Ödül Avcılığı</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/yarisma">
            <Trophy className="mr-2 h-4 w-4" />
            <span>Yarışma</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/submit">
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>Yeni Araç Öner</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/developer">
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Geliştirici Portalı</span>
          </Link>
        </DropdownMenuItem>

        {isProUser && (
          <DropdownMenuItem asChild>
            <Link href="/studyo">
              <WandSparkles className="mr-2 h-4 w-4 text-purple-500" />
              <span>AI Stüdyo</span>
            </Link>
          </DropdownMenuItem>
        )}

        {!isProUser && !isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/uyelik">
              <Crown className="mr-2 h-4 w-4 text-purple-500" />
              <span>Pro&apos;ya Yükselt</span>
            </Link>
          </DropdownMenuItem>
        )}

        {isAdmin && (
          <>
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
              <span>Çıkış Yap</span>
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
