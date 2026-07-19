import logger from '@/utils/logger';
('use client');

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight, LoaderCircle, Search, X } from 'lucide-react';
import { getSearchSuggestions } from '@/app/actions/tools';
import ToolIcon from '@/components/ToolIcon';
import { Input } from '@/components/ui/input';
import { trackEvent } from '@/utils/analytics';

export function SearchInput() {
  const t = useTranslations('Homepage');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = React.useRef(null);
  const requestIdRef = React.useRef(0);
  const containerRef = React.useRef(null);

  const [searchTerm, setSearchTerm] = React.useState(searchParams.get('search') || '');
  const [suggestions, setSuggestions] = React.useState([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

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

  const closeSuggestions = React.useCallback(() => {
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const scheduleSuggestions = React.useCallback(
    (value) => {
      window.clearTimeout(timeoutRef.current);

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      timeoutRef.current = window.setTimeout(async () => {
        const normalizedValue = value.trim();

        if (normalizedValue.length < 2) {
          closeSuggestions();
          return;
        }

        try {
          const results = await getSearchSuggestions(normalizedValue);
          if (requestIdRef.current !== requestId) return;

          const safeResults = Array.isArray(results) ? results : [];
          setSuggestions(safeResults);
          setShowSuggestions(safeResults.length > 0);
        } catch (error) {
          logger.error('Arama önerileri alınamadı:', error);
          if (requestIdRef.current !== requestId) return;
          closeSuggestions();
        }
      }, 300);
    },
    [closeSuggestions]
  );

  const handleChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    scheduleSuggestions(value);
  };

  const handleClear = () => {
    window.clearTimeout(timeoutRef.current);
    requestIdRef.current += 1;
    setSearchTerm('');
    applySearch('');
    closeSuggestions();
    trackEvent('tool_search_clear', {
      page_path: pathname,
      preserved_filter_count: Array.from(searchParams.keys()).filter(
        (key) => key !== 'search' && key !== 'page'
      ).length,
    });
  };

  // Keep local input in sync when URL search changes (filters, back/forward, clear chips).
  React.useEffect(() => {
    setSearchTerm(currentSearchInUrl);
  }, [currentSearchInUrl]);

  React.useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <search className="relative w-full" aria-label={t('searchRegionLabel')} ref={containerRef}>
      <label htmlFor="tool-search" className="sr-only">
        {t('searchLabel')}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:left-3 sm:h-4 sm:w-4"
        />
        <Input
          id="tool-search"
          type="search"
          role="combobox"
          autoComplete="off"
          enterKeyHint="search"
          placeholder={t('searchPlaceholder')}
          className="block h-9 w-full rounded-lg border border-input bg-background/80 py-1.5 pl-9 pr-9 text-sm shadow-sm backdrop-blur-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 sm:h-9 sm:pl-10"
          value={searchTerm}
          onChange={handleChange}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applySearch(searchTerm);
              setShowSuggestions(false);
              return;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              if (showSuggestions) {
                setShowSuggestions(false);
                return;
              }
              if (searchTerm) {
                handleClear();
              }
            }
          }}
          aria-autocomplete="list"
          aria-controls={showSuggestions ? 'tool-search-suggestions' : undefined}
          aria-describedby="tool-search-status"
          aria-expanded={showSuggestions}
          aria-haspopup="listbox"
        />
        {isUpdating ? (
          <LoaderCircle
            aria-hidden="true"
            className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        ) : searchTerm ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('searchClear')}
          >
            <X aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        ) : null}
      </div>
      <span id="tool-search-status" className="sr-only" aria-live="polite">
        {isUpdating ? t('searchUpdating') : t('searchReady')}
      </span>

      {showSuggestions && suggestions.length > 0 && (
        <div
          id="tool-search-suggestions"
          role="listbox"
          aria-label={t('suggestionsLabel')}
          className="glass-panel absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border-primary/20 text-popover-foreground shadow-2xl duration-200 animate-in fade-in slide-in-from-top-2"
        >
          <div className="p-3">
            <h4 className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-primary">
              {t('suggestionsHeading')}
            </h4>
            <div className="flex flex-col gap-1">
              {suggestions.map((tool) => (
                <Link
                  key={tool.id}
                  href={`/tool/${tool.slug}`}
                  onClick={() => setShowSuggestions(false)}
                  role="option"
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-primary/10 hover:text-primary"
                >
                  <ToolIcon
                    name={tool.name}
                    link={tool.link}
                    className="h-10 w-10 rounded-lg border border-border/50 bg-background shadow-sm transition-all group-hover:scale-105 group-hover:shadow"
                  />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-sm font-semibold sm:text-base">{tool.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {tool.category_name}
                    </span>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 translate-x-[-10px] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 sm:h-5 sm:w-5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </search>
  );
}
