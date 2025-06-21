"use client";

import * as React from "react";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function MultiSelectTools({
  allTools,
  selectedTools,
  onSelectionChange,
}) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (toolId) => {
    const newSelection = new Set(selectedTools);
    if (newSelection.has(toolId)) {
      newSelection.delete(toolId);
    } else {
      newSelection.add(toolId);
    }
    onSelectionChange(newSelection);
  };

  const selectedToolObjects = allTools.filter((tool) =>
    selectedTools.has(tool.id)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[40px]"
        >
          <div className="flex flex-wrap gap-1">
            {selectedToolObjects.length > 0
              ? selectedToolObjects.map((tool) => (
                  <Badge key={tool.id} variant="secondary">
                    {tool.name}
                  </Badge>
                ))
              : "İlişkili Araç Seç..."}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Araç ara..." />
          <CommandList>
            <CommandEmpty>Araç bulunamadı.</CommandEmpty>
            <CommandGroup>
              {allTools.map((tool) => (
                <CommandItem
                  key={tool.id}
                  value={tool.name}
                  onSelect={() => handleSelect(tool.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedTools.has(tool.id) ? "opacity-100" : "opacity-0"
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
