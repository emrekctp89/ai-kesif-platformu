"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SortSelect({ value, onValueChange }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
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
