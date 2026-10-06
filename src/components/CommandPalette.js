'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
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
import { runGlobalSearch } from '@/app/actions/globalSearch';
import { FileText, Laptop, User, CornerDownLeft, Search, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

const resultIcons = {
  Tool: <Laptop className="h-5 w-5 text-muted-foreground" />,
  Post: <FileText className="h-5 w-5 text-muted-foreground" />,
  Kullanıcı: <User className="h-5 w-5 text-muted-foreground" />,
};
const fallbackResultIcon = <Sparkles className="h-5 w-5 text-muted-foreground" />;

export function CommandPalette() {
  const t = useTranslations('GlobalSearch');
  const router = useRouter();
  const inputRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [data, setData] = React.useState({ results: [], suggestions: [] });
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState('');
  const [retryCount, setRetryCount] = React.useState(0);
  const [selectedValue, setSelectedValue] = React.useState('/submit');

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
    setSelectedValue(searchQuery.length > 1 ? '' : '/submit');
    setIsLoading(open && searchQuery.length > 1);

    if (open && searchQuery.length > 1 && query === debouncedQuery) {
      const search = async () => {
        try {
          const response = await runGlobalSearch(searchQuery);
          if (!active) return;
          if (response.error) {
            setSearchError('Arama tamamlanamadı. Lütfen tekrar deneyin.');
          } else {
            setData({ results: response.results || [], suggestions: response.suggestions || [] });
            setSelectedValue(
              response.results?.[0]?.url || response.suggestions?.[0]?.url || '/submit'
            );
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
        aria-label={t('open')}
        aria-haspopup="dialog"
        title={t('shortcut')}
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        commandProps={{ value: selectedValue, onValueChange: setSelectedValue }}
      >
        <DialogTitle className="sr-only">{t('title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('description')}</DialogDescription>
        <CommandInput
          ref={inputRef}
          placeholder={t('placeholder')}
          clearLabel={t('clear')}
          value={query}
          onValueChange={setQuery}
          onClear={
            query
              ? () => {
                  setQuery('');
                  inputRef.current?.focus();
                }
              : undefined
          }
        />
        <CommandList>
          {isLoading && (
            <div role="status" className="py-6 text-center text-sm">
              {t('loading')}
            </div>
          )}
          {!isLoading && data.results.length === 0 && data.suggestions.length === 0 && (
            <div role="status" className="py-6 text-center text-sm">
              {searchError ? t('error') : query.trim().length < 2 ? t('minimum') : t('empty')}
              {searchError && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRetryCount((count) => count + 1)}
                  >
                    {t('retry')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {Object.entries(groupedResults)
            .sort(([firstType], [secondType]) =>
              firstType === 'Tool' ? -1 : secondType === 'Tool' ? 1 : 0
            )
            .map(([type, items]) => (
              <CommandGroup key={type} heading={type}>
                {items.map((item) => (
                  <CommandItem
                    key={item.url}
                    value={item.url}
                    onSelect={() => runCommand(() => router.push(item.url))}
                  >
                    <div className="flex items-center gap-3">
                      {type === 'Kullanıcı' ? (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={item.image_url} />
                          <AvatarFallback>{item.title.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                      ) : (
                        resultIcons[type] || fallbackResultIcon
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
            <CommandGroup heading={t('suggestions')}>
              {data.suggestions.map((item) => (
                <CommandItem
                  key={item.url}
                  value={item.url}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  <div className="flex items-center gap-3">
                    {
                      resultIcons[
                        item.result_type.charAt(0).toUpperCase() + item.result_type.slice(1)
                      ] || fallbackResultIcon
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
          <CommandGroup heading={t('actions')}>
            <CommandItem
              value="/submit"
              disabled={isLoading}
              onSelect={() => runCommand(() => router.push('/submit'))}
            >
              <CornerDownLeft className="mr-2 h-4 w-4" />
              {t('submit')}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
