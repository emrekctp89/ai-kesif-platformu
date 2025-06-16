"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CategorySelect({ categories }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") || "all";

  const handleValueChange = (value) => {
    // Mevcut tüm URL parametrelerini alıyoruz (sort, search vb.)
    const params = new URLSearchParams(searchParams.toString());

    // Eğer "Tümü" seçilirse, URL'den kategori parametresini kaldırıyoruz.
    if (value === "all") {
      params.delete("category");
    } else {
      // Başka bir kategori seçilirse, o kategoriye yönlendiriyoruz.
      params.set("category", value);
    }

    // Filtre değiştiğinde her zaman 1. sayfaya dön
    params.delete("page");

    router.push(`/?${params.toString()}`);
  };

  return (
    <Select value={currentCategory} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full md:w-[280px]">
        <SelectValue placeholder="Bir kategori seçin..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Kategoriler</SelectLabel>
          <SelectItem value="all">Tüm Kategoriler</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.slug} value={category.slug}>
              {category.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
