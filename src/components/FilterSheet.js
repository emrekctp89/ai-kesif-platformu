"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import { CategorySelect } from "./CategorySelect";
import { SortSelect } from "./SortSelect";
import { TagFilter } from "./TagFilter";
import { AdvancedFilters } from "./AdvancedFilters";
import { Label } from "@/components/ui/label";

export function FilterSheet({ categories, allTags }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = React.useState(false);

  // Tüm filtrelerin anlık durumunu burada, tek bir yerde tutuyoruz.
  const [tempFilters, setTempFilters] = React.useState({
    sort: searchParams.get("sort") || "newest",
    category: searchParams.get("category") || "all",
    tags: new Set(searchParams.get("tags")?.split(",").map(Number) || []),
    pricing: searchParams.get("pricing") || "",
    platforms: new Set(searchParams.get("platforms")?.split(",") || []),
  });

  // Herhangi bir filtrenin aktif olup olmadığını hesaplıyoruz.
  const activeFilterCount = Object.values(tempFilters).reduce(
    (count, value) => {
      if (value instanceof Set) return count + value.size;
      if (value && value !== "newest" && value !== "all") return count + 1;
      return count;
    },
    0
  );

  // "Filtreleri Uygula" butonuna basıldığında çalışır
  const handleApplyFilters = () => {
    const newParams = new URLSearchParams();

    if (tempFilters.sort && tempFilters.sort !== "newest")
      newParams.set("sort", tempFilters.sort);
    if (tempFilters.category && tempFilters.category !== "all")
      newParams.set("category", tempFilters.category);
    if (tempFilters.tags.size > 0)
      newParams.set("tags", Array.from(tempFilters.tags).join(","));
    if (tempFilters.pricing) newParams.set("pricing", tempFilters.pricing);
    if (tempFilters.platforms.size > 0)
      newParams.set("platforms", Array.from(tempFilters.platforms).join(","));

    router.push(`/?${newParams.toString()}`);
    setIsOpen(false); // Çekmeceyi kapat
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filtrele 
                    {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Filtreler</SheetTitle>
          <SheetDescription>
            Sonuçları daraltmak için aşağıdaki filtreleri kullanın.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-6">
          
          <Separator />
          <div className="space-y-2">
            <Label>Kategori</Label>
            <CategorySelect
              categories={categories}
              value={tempFilters.category}
              onValueChange={(v) =>
                setTempFilters((f) => ({ ...f, category: v }))
              }
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Etiketler</Label>
            <TagFilter
              allTags={allTags}
              selectedTags={tempFilters.tags}
              onTagToggle={(tagId) =>
                setTempFilters((f) => {
                  const newTags = new Set(f.tags);
                  if (newTags.has(tagId)) newTags.delete(tagId);
                  else newTags.add(tagId);
                  return { ...f, tags: newTags };
                })
              }
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Gelişmiş</Label>
            <AdvancedFilters
              selectedPricing={tempFilters.pricing}
              selectedPlatforms={tempFilters.platforms}
              onFiltersChange={(filters) =>
                setTempFilters((f) => ({ ...f, ...filters }))
              }
            />
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                router.push("/");
                setIsOpen(false);
              }}
            >
              Temizle
            </Button>
          </SheetClose>
          <Button onClick={handleApplyFilters}>Filtreleri Uygula</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
