"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ListFilter } from "lucide-react";

export function TierFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL'den mevcut seçili seviyeyi alıyoruz
  const selectedTier = searchParams.get("tier") || "";

  // Bir seçenek seçildiğinde URL'i güncelleyen fonksiyon
  const handleSelect = (tier) => {
    const params = new URLSearchParams(searchParams.toString());

    // Eğer zaten seçili olan seviyeye tekrar tıklanırsa, filtreyi kaldır.
    // Aksi takdirde, yeni seçilen seviyeyi ayarla.
    if (selectedTier === tier) {
      params.delete("tier");
    } else {
      params.set("tier", tier);
    }

    // Filtre değiştiğinde her zaman 1. sayfaya dön
    params.delete("page");
    router.push(`/?${params.toString()}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 w-full md:w-auto">
          <ListFilter className="mr-2 h-4 w-4" />
          Seviye
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Seviyeye Göre Filtrele</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* "Tüm Seviyeler" seçeneği */}
        <DropdownMenuCheckboxItem
          checked={!selectedTier}
          onCheckedChange={() => handleSelect("")}
        >
          Tüm Seviyeler
        </DropdownMenuCheckboxItem>
        {/* "Pro" seçeneği */}
        <DropdownMenuCheckboxItem
          checked={selectedTier === "Pro"}
          onCheckedChange={() => handleSelect("Pro")}
        >
          Pro
        </DropdownMenuCheckboxItem>
        {/* "Sponsorlu" seçeneği */}
        <DropdownMenuCheckboxItem
          checked={selectedTier === "Sponsorlu"}
          onCheckedChange={() => handleSelect("Sponsorlu")}
        >
          Sponsorlu
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
