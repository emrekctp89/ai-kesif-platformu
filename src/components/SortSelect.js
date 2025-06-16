"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "newest";

  const handleValueChange = (value) => {
    // Mevcut tüm URL parametrelerini alıyoruz
    const params = new URLSearchParams(searchParams.toString());

    // Yeni sıralama parametresini ekliyoruz
    params.set("sort", value);

    // Sıralama değiştiğinde her zaman 1. sayfaya dön
    params.delete("page");

    // Yeni URL'e yönlendiriyoruz
    router.push(`/?${params.toString()}`);
  };

  return (
    <Select value={currentSort} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full md:w-[180px]">
        <SelectValue placeholder="Sırala..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="newest">En Yeni</SelectItem>
          <SelectItem value="rating">En Yüksek Puanlı</SelectItem>
          <SelectItem value="popularity">En Çok Oylanan</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
