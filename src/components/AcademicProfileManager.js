'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Check, ChevronsUpDown } from 'lucide-react';

import { updateUserPapers } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function AcademicProfileManager({ allPapers, userPapers }) {
  const t = useTranslations('ResearchPage');
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = React.useState(false);
  const [selectedPapers, setSelectedPapers] = React.useState(new Set(userPapers.map((p) => p.id)));
  const selectedPaperObjects = allPapers.filter((paper) => selectedPapers.has(paper.id));

  const handleFormSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData();
    selectedPapers.forEach((id) => formData.append('paperId', id));

    startTransition(async () => {
      const result = await updateUserPapers(formData);
      if (result.error) toast.error(result.error);
      else toast.success(result.success);
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="h-auto min-h-10 w-full justify-between"
          >
            <div className="flex flex-wrap gap-1">
              {selectedPaperObjects.length > 0
                ? selectedPaperObjects.map((paper) => (
                    <Badge key={paper.id} variant="secondary">
                      {paper.title}
                    </Badge>
                  ))
                : t('selectPapers')}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder={t('searchPapers')} />
            <CommandList>
              <CommandEmpty>{t('paperNotFound')}</CommandEmpty>
              <CommandGroup>
                {allPapers.map((paper) => (
                  <CommandItem
                    key={paper.id}
                    value={paper.title}
                    onSelect={() => {
                      const next = new Set(selectedPapers);
                      if (next.has(paper.id)) next.delete(paper.id);
                      else next.add(paper.id);
                      setSelectedPapers(next);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedPapers.has(paper.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {paper.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="brand-gradient min-h-10 shadow-md">
          {isPending ? t('savingPapers') : t('savePapers')}
        </Button>
      </div>
    </form>
  );
}
