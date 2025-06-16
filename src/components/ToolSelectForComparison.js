"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToolSelectForComparison({ allTools, selectedSlugs }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [selectedValues, setSelectedValues] = React.useState(
    new Set(selectedSlugs)
  );

  const handleSelect = (slug) => {
    const newSelection = new Set(selectedValues);
    if (newSelection.has(slug)) {
      newSelection.delete(slug);
    } else {
      if (newSelection.size < 4) {
        newSelection.add(slug);
      }
    }
    setSelectedValues(newSelection);

    const params = new URLSearchParams();
    if (newSelection.size > 0) {
      params.set("tools", Array.from(newSelection).join(","));
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedToolObjects = allTools.filter((tool) =>
    selectedValues.has(tool.slug)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full md:w-[350px] min-h-[40px] h-auto justify-between"
        >
          <div className="flex flex-wrap gap-1">
            {selectedToolObjects.length > 0
              ? selectedToolObjects.map((tool) => (
                  <Badge key={tool.slug} variant="secondary" className="gap-1">
                    {tool.name}
                    {/* DEĞİŞİKLİK: 'button' yerine 'span' kullanıyoruz */}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation(); // Popover'ın kapanmasını engelle
                        handleSelect(tool.slug);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          handleSelect(tool.slug);
                        }
                      }}
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-destructive/80"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                ))
              : "Karşılaştırmak için araç seçin..."}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Araç ara..." />
          <CommandList>
            <CommandEmpty>Araç bulunamadı.</CommandEmpty>
            <CommandGroup>
              {allTools.map((tool) => (
                <CommandItem
                  key={tool.slug}
                  value={tool.name}
                  onSelect={() => handleSelect(tool.slug)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValues.has(tool.slug)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {tool.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
