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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const contentTypes = ["Görsel", "Metin", "Kod"];
const sortOptions = {
  newest: "En Yeni",
  popular: "En Popüler",
};

// Araç Seçim Menüsü
function ToolSelect({ allTools, selectedToolId, onSelect }) {
  const [open, setOpen] = React.useState(false);
  const selectedToolName = allTools.find(
    (tool) => tool.id.toString() === selectedToolId
  )?.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full md:w-[200px] justify-between"
        >
          {selectedToolName || "Bir Araç Seçin..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Araç ara..." />
          <CommandList>
            <CommandEmpty>Araç bulunamadı.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => onSelect(null)}>
                Tüm Araçlar
              </CommandItem>
              {allTools.map((tool) => (
                <CommandItem
                  key={tool.id}
                  value={tool.name}
                  onSelect={() => {
                    onSelect(tool.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedToolId === tool.id.toString()
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

// Ana Filtreleme Bileşeni
export function ShowcaseFilters({ allTools }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateURLParams = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/eserler?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
      <Select
        defaultValue={searchParams.get("contentType") || ""}
        onValueChange={(value) => updateURLParams("contentType", value)}
      >
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="İçerik Tipi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tüm Tipler</SelectItem>
          {contentTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ToolSelect
        allTools={allTools}
        selectedToolId={searchParams.get("toolId")}
        onSelect={(value) => updateURLParams("toolId", value)}
      />

      <Select
        defaultValue={searchParams.get("sortBy") || "newest"}
        onValueChange={(value) => updateURLParams("sortBy", value)}
      >
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Sırala" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(sortOptions).map(([key, value]) => (
            <SelectItem key={key} value={key}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
