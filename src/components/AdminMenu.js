"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Menu, LayoutDashboard, Settings, Bot } from "lucide-react";

export function AdminMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Admin Menüsünü Aç</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[250px]">
        <SheetHeader>
          <SheetTitle>Admin Paneli</SheetTitle>
        </SheetHeader>
        <div className="grid gap-2 py-6">
          {/* YENİ: Co-Pilot linki eklendi */}
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/admin/co-pilot">
              <Bot className="mr-2 h-4 w-4" />
              AI Co-Pilot
            </Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/admin">
              <Settings className="mr-2 h-4 w-4" />
              İçerik Yönetimi
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
