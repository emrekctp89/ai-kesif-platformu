'use client';

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';
import { Logo } from './Logo';

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <Logo />
            <span className="font-bold text-lg">AI Keşif</span>
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button asChild variant="secondary">
            <Link href="/submit">Araç Öner</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

