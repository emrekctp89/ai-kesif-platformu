'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const MAX_TOOLS = 4;

export function ToolSelectForComparison({ allTools, selectedSlugs }) {
  const t = useTranslations('Compare');
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [selectedValues, setSelectedValues] = React.useState(() => new Set(selectedSlugs || []));

  React.useEffect(() => {
    setSelectedValues(new Set(selectedSlugs || []));
  }, [selectedSlugs]);

  const pushSelection = React.useCallback(
    (nextSet) => {
      const params = new URLSearchParams();
      if (nextSet.size > 0) {
        params.set('tools', Array.from(nextSet).join(','));
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const handleSelect = (slug) => {
    const newSelection = new Set(selectedValues);
    if (newSelection.has(slug)) {
      newSelection.delete(slug);
    } else {
      if (newSelection.size >= MAX_TOOLS) {
        toast.error(t('maxTools'));
        return;
      }
      newSelection.add(slug);
    }
    setSelectedValues(newSelection);
    pushSelection(newSelection);
  };

  const handleClear = () => {
    const empty = new Set();
    setSelectedValues(empty);
    pushSelection(empty);
  };

  const selectedToolObjects = (allTools || []).filter((tool) => selectedValues.has(tool.slug));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-12 w-full justify-between rounded-2xl border-border/60 bg-background/80 px-3 py-2 text-left shadow-sm"
          >
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {selectedToolObjects.length > 0 ? (
                selectedToolObjects.map((tool) => (
                  <Badge key={tool.slug} variant="secondary" className="max-w-full gap-1 py-1">
                    <span className="truncate">{tool.name}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`${tool.name} kaldır`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(tool.slug);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelect(tool.slug);
                        }
                      }}
                      className="ml-0.5 rounded-full p-0.5 outline-none ring-offset-background hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">{t('selectPlaceholder')}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="center">
          <Command>
            <CommandInput placeholder={t('searchPlaceholder')} />
            <CommandList>
              <CommandEmpty>{t('notFound')}</CommandEmpty>
              <CommandGroup>
                {(allTools || []).map((tool) => {
                  const isSelected = selectedValues.has(tool.slug);
                  return (
                    <CommandItem
                      key={tool.slug}
                      value={tool.name}
                      onSelect={() => handleSelect(tool.slug)}
                    >
                      <Check
                        className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                        aria-hidden="true"
                      />
                      {tool.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span>
          {selectedValues.size}/{MAX_TOOLS}
          {selectedValues.size >= MAX_TOOLS ? ` · ${t('maxTools')}` : ''}
        </span>
        {selectedValues.size > 0 ? (
          <Button type="button" variant="ghost" size="sm" className="h-8" onClick={handleClear}>
            {t('clearAll')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
