'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { trackEvent } from '@/utils/analytics';
import { LoaderCircle, Search, X, ArrowRight } from 'lucide-react';
import { getSearchSuggestions } from '@/app/actions/tools';
import Link from 'next/link';
import ToolIcon from '@/components/ToolIcon';

export function SearchInput() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = React.useRef(null);

  const [searchTerm, setSearchTerm] = React.useState(searchParams.get('search') || '');
  const currentSearchInUrl = searchParams.get('search') || '';
  const isUpdating = searchTerm !== currentSearchInUrl;

  const [suggestions, setSuggestions] = React.useState([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const containerRef = React.useRef(null);

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
    timeoutRef.current = window.setTimeout(async () => {
      // SADECE önerileri çekiyoruz, sayfayı (URL'yi) anında yenilemiyoruz!
      if (value.length >= 2) {
        const results = await getSearchSuggestions(value);
        setSuggestions(results);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // 300ms gecikme (daha akıcı his için)
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
    setSuggestions([]);
    setShowSuggestions(false);
    trackEvent('tool_search_clear', {
      page_path: pathname,
      preserved_filter_count: Array.from(searchParams.keys()).filter(
        (key) => key !== 'search' && key !== 'page'
      ).length,
    });
  };

  React.useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  // Kapanış tıkını yönetmek için (dışarı tıklandığında dropdown kapanır)
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
    <search className="w-full relative" aria-label="Araçlarda ara" ref={containerRef}>
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
          className="block h-10 w-full rounded-xl border border-input py-2 pl-10 pr-10 text-sm shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:shadow-[0_0_15px_rgba(var(--primary),0.3)] bg-background/80 backdrop-blur-sm sm:h-12 sm:text-base sm:py-3 sm:pl-11"
          value={searchTerm}
          onChange={handleChange}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applySearch(searchTerm);
              setShowSuggestions(false);
            }
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
            className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        ) : searchTerm ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Aramayı temizle"
          >
            <X aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        ) : null}
      </div>
      <span id="tool-search-status" className="sr-only" aria-live="polite">
        {isUpdating ? 'Arama sonuçları güncelleniyor' : 'Arama sonuçları güncel'}
      </span>

      {/* Akıllı Öneriler Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-panel text-popover-foreground rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 border-primary/20">
          <div className="p-3">
            <h4 className="text-xs font-bold text-primary mb-2 px-2 uppercase tracking-wider">
              Önerilen Araçlar
            </h4>
            <div className="flex flex-col gap-1">
              {suggestions.map((tool) => (
                <Link
                  key={tool.id}
                  href={`/tool/${tool.slug}`}
                  onClick={() => setShowSuggestions(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200 group"
                >
                  <ToolIcon
                    name={tool.name}
                    link={tool.link}
                    className="w-10 h-10 rounded-lg border border-border/50 bg-background shadow-sm group-hover:shadow group-hover:scale-105 transition-all"
                  />
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-sm sm:text-base truncate">{tool.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {tool.category_name}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </search>
  );
}
