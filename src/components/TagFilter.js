'use client';

import * as React from 'react';
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
import { Check, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export function TagFilter({ allTags, selectedTags, onTagToggle }) {
  const t = useTranslations('Homepage');
  const [open, setOpen] = React.useState(false);
  const selectedTagObjects = allTags.filter((tag) => selectedTags.has(tag.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 w-full border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('tagsHeading')}
          {selectedTagObjects.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {t('selectedTagsCount', { count: selectedTagObjects.length })}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedTagObjects.slice(0, 2).map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="rounded-sm px-1 font-normal">
                    {tag.name}
                  </Badge>
                ))}
                {selectedTagObjects.length > 2 && (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    +{selectedTagObjects.length - 2}
                  </Badge>
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('tagSearchPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('tagEmpty')}</CommandEmpty>
            <CommandGroup>
              {allTags.map((tag) => (
                <CommandItem key={tag.id} value={tag.name} onSelect={() => onTagToggle(tag.id)}>
                  <Check
                    aria-hidden="true"
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedTags.has(tag.id) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {tag.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
