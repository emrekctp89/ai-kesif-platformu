'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useDebounce } from 'use-debounce';
import { runAdvancedOmniSearch } from '@/app/actions';
import { FileText, Laptop, User, CornerDownLeft, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

const resultIcons = {
  Tool: <Laptop className="h-5 w-5 text-muted-foreground" />,
  Post: <FileText className="h-5 w-5 text-muted-foreground" />,
  Kullanıcı: <User className="h-5 w-5 text-muted-foreground" />,
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [data, setData] = React.useState({ results: [], suggestions: [] });
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState('');
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    const down = (e) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !e.repeat) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  React.useEffect(() => {
    let active = true;
    const searchQuery = query.trim();
    setData({ results: [], suggestions: [] });
    setSearchError('');
    setIsLoading(open && searchQuery.length > 1);

    if (open && searchQuery.length > 1 && query === debouncedQuery) {
      const search = async () => {
        try {
          const response = await runAdvancedOmniSearch(searchQuery);
          if (!active) return;
          if (response.error) {
            setSearchError('Arama tamamlanamadı. Lütfen tekrar deneyin.');
          } else {
            setData({ results: response.results || [], suggestions: response.suggestions || [] });
          }
        } catch {
          if (active) setSearchError('Arama tamamlanamadı. Lütfen tekrar deneyin.');
        } finally {
          if (active) setIsLoading(false);
        }
      };
      search();
    }
    return () => {
      active = false;
    };
  }, [debouncedQuery, query, open, retryCount]);

  const runCommand = React.useCallback((command) => {
    setOpen(false);
    command();
  }, []);

  const groupedResults = data.results.reduce((acc, result) => {
    const type = result.result_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(result);
    return acc;
  }, {});

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Hızlı aramayı aç"
        aria-haspopup="dialog"
        title="Hızlı Arama (Ctrl+K / Cmd+K)"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <DialogTitle className="sr-only">Genel Arama</DialogTitle>
        <DialogDescription className="sr-only">
          Sitedeki herhangi bir şeyi arayın.
        </DialogDescription>
        <CommandInput
          placeholder="Bir problem, fikir veya araç adı yazın..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && (
            <div role="status" className="py-6 text-center text-sm">
              Aranıyor...
            </div>
          )}
          {!isLoading && data.results.length === 0 && data.suggestions.length === 0 && (
            <div role="status" className="py-6 text-center text-sm">
              {searchError ||
                (query.trim().length < 2
                  ? 'Aramak için en az 2 karakter yazın.'
                  : 'Sonuç bulunamadı. Farklı bir kelime deneyin.')}
              {searchError && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRetryCount((count) => count + 1)}
                  >
                    Tekrar dene
                  </Button>
                </div>
              )}
            </div>
          )}

          {Object.entries(groupedResults).map(([type, items]) => (
            <CommandGroup key={type} heading={type}>
              {items.map((item) => (
                <CommandItem
                  key={item.url}
                  value={`${item.title} ${item.description}`}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  <div className="flex items-center gap-3">
                    {type === 'Kullanıcı' ? (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={item.image_url} />
                        <AvatarFallback>{item.title.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      resultIcons[type]
                    )}
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          {!isLoading && data.results.length === 0 && data.suggestions.length > 0 && (
            <CommandGroup heading="Belki bunlar da ilginizi çeker...">
              {data.suggestions.map((item) => (
                <CommandItem
                  key={item.url}
                  value={item.title}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  <div className="flex items-center gap-3">
                    {
                      resultIcons[
                        item.result_type.charAt(0).toUpperCase() + item.result_type.slice(1)
                      ]
                    }
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />
          <CommandGroup heading="Hızlı Eylemler">
            <CommandItem onSelect={() => runCommand(() => router.push('/submit'))}>
              <CornerDownLeft className="mr-2 h-4 w-4" />
              Yeni Araç Öner
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
