"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Filter } from "lucide-react";
import { CategorySelect } from "./CategorySelect";
import { SortSelect } from "./SortSelect";
import { TagFilter } from "./TagFilter";
import { AdvancedFilters } from "./AdvancedFilters";
import { Label } from "@/components/ui/label";

export function FilterSheet({ categories, allTags }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filtrele & Sırala
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
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sırala</Label>
            <SortSelect />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Kategori</Label>
            <CategorySelect categories={categories} />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Etiketler</Label>
            <TagFilter allTags={allTags} />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Gelişmiş</Label>
            <AdvancedFilters />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
