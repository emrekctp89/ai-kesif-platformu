'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { trackEvent } from '@/utils/analytics';
import { LoaderCircle, Search, X } from 'lucide-react';

export function SearchInput() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = React.useRef(null);

  const [searchTerm, setSearchTerm] = React.useState(searchParams.get('search') || '');
  const currentSearchInUrl = searchParams.get('search') || '';
  const isUpdating = searchTerm !== currentSearchInUrl;

  const applySearch = React.useCallback(
    (value) => {
      const params = new URLSearchParams(searchParams.toString());
      const normalizedValue = value.trim();

      if (normalizedValue) {
        params.set('search', normalizedValue);
        trackEvent('tool_search', {
          query_length: normalizedValue.length,
          page_path: pathname,
        });
      } else {
        params.delete('search');
      }

      params.delete('page');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  const scheduleSearch = (value) => {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => applySearch(value), 500);
  };

  const handleChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    scheduleSearch(value);
  };

  const handleClear = () => {
    window.clearTimeout(timeoutRef.current);
    setSearchTerm('');
    applySearch('');
    trackEvent('tool_search_clear', {
      page_path: pathname,
      preserved_filter_count: Array.from(searchParams.keys()).filter(
        (key) => key !== 'search' && key !== 'page'
      ).length,
    });
  };

  React.useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  return (
    <search className="w-full" aria-label="Araçlarda ara">
      <label htmlFor="tool-search" className="sr-only">
        Yapay zeka aracı ara
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="tool-search"
          type="text"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Ne yapmak istiyorsunuz? Örn. video oluşturma"
          className="block h-9 w-full rounded-lg border border-input py-1.5 pl-9 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:py-2"
          value={searchTerm}
          onChange={handleChange}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && searchTerm) {
              event.preventDefault();
              handleClear();
            }
          }}
          aria-describedby="tool-search-status"
        />
        {isUpdating ? (
          <LoaderCircle
            aria-hidden="true"
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        ) : searchTerm ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Aramayı temizle"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <span id="tool-search-status" className="sr-only" aria-live="polite">
        {isUpdating ? 'Arama sonuçları güncelleniyor' : 'Arama sonuçları güncel'}
      </span>
    </search>
  );
}
