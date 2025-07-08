"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/app/actions";
import { User, PlusCircle, LogOut, Sparkles, Crown } from "lucide-react";

// Bu bileşen, Header'dan gelen kullanıcı bilgilerini kullanarak menüyü oluşturur.
export function UserNav({ user, profile, isProUser, isAdmin }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-transparent hover:border-primary transition-colors">
            <AvatarImage
              src={profile?.avatar_url}
              alt={profile?.username || user.email}
            />
            <AvatarFallback>
              {user.email?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.username || "Kullanıcı"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
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
          <Link href="/submit">
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>Yeni Araç Öner</span>
          </Link>
        </DropdownMenuItem>
        {/* Pro olmayanlar için yükseltme linki */}
        {/*} {!isProUser && !isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/uyelik">
              <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
              <span>Pro'ya Yükselt</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />*/}
        <DropdownMenuItem asChild>
          <form action={signOut} className="w-full">
            <button
              type="submit"
              className="w-full text-left cursor-pointer flex items-center"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Çıkış Yap</span>
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
