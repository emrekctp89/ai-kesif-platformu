'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Menu, Bot, Lightbulb, PlusCircle, Info, Mail } from 'lucide-react';

export function MobileNav({ user, isProUser }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menüyü aç">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Navigasyonu Aç</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-[320px]">
        <SheetHeader className="sr-only">
          <SheetTitle>Ana menü</SheetTitle>
          <SheetDescription>Site bölümleri arasında gezinin.</SheetDescription>
        </SheetHeader>
        <Link
          href="/"
          prefetch={false}
          className="mr-6 mb-8 flex items-center space-x-2"
          onClick={() => setOpen(false)}
        >
          <Bot className="h-6 w-6 text-primary" />
          <span className="font-bold">AI Keşif</span>
        </Link>
        <div className="flex flex-col gap-2">
          {[
            { href: '/', label: 'Tüm Araçlar', icon: Bot },
            { href: '/tavsiye', label: 'AI Tavsiye', icon: Lightbulb },
            { href: '/submit', label: 'Araç Öner', icon: PlusCircle },
            { href: '/hakkimizda', label: 'Hakkımızda', icon: Info },
            { href: '/iletisim', label: 'İletişim', icon: Mail },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
