'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from './ui/button'
import { Menu, Bot, GitCompareArrows, Sparkles } from 'lucide-react'

export function MobileNav({ user, isProUser }) {
    const [open, setOpen] = React.useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Navigasyonu Aç</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
                <Link href="/kesfet" className="mr-6 flex items-center space-x-2 mb-6" onClick={() => setOpen(false)}>
                  <Bot className="h-6 w-6 text-primary" />
                  <span className="font-bold">AI Keşif</span>
                </Link>
                <div className="flex flex-col gap-3">
                    <Link href="/" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">Tüm Araçlar</Link>
                    <Link href="/topluluk" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">Topluluk</Link>
                    <Link href="/eserler" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">Eserler</Link>
                    <Link href="/blog" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">Blog</Link>
                    <Link href="/karsilastir" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">Karşılaştır</Link>
                    
                    {user && (
                        <>
                            <Link href="/akis" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">Akış</Link>
                            <Link href="/studyo" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">Stüdyo</Link>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
