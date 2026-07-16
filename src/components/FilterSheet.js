'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Filter } from 'lucide-react';
import { CategorySelect } from './CategorySelect';
import { SortSelect } from './SortSelect';
import { TagFilter } from './TagFilter';
import { AdvancedFilters } from './AdvancedFilters';
import { Label } from '@/components/ui/label';
import { trackEvent } from '@/utils/analytics';

const filterParamKeys = ['sort', 'category', 'tags', 'pricing', 'platforms'];

function filtersFromSearchParams(searchParams) {
  return {
    sort: searchParams.get('sort') || 'newest',
    category: searchParams.get('category') || 'all',
    tags: new Set(
      (searchParams.get('tags') || '')
        .split(',')
        .filter(Boolean)
        .map(Number)
        .filter(Number.isFinite)
    ),
    pricing: searchParams.get('pricing') || '',
    platforms: new Set((searchParams.get('platforms') || '').split(',').filter(Boolean)),
  };
}

function countActiveFilters(filters) {
  return Object.values(filters).reduce((count, value) => {
    if (value instanceof Set) return count + value.size;
    if (value && value !== 'newest' && value !== 'all') return count + 1;
    return count;
  }, 0);
}

export function FilterSheet({ categories, allTags, fixedSearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [isOpen, setIsOpen] = React.useState(false);
  const hasFixedCategory = Boolean(fixedSearchParams?.category);

  const [tempFilters, setTempFilters] = React.useState(() => filtersFromSearchParams(searchParams));

  const appliedFilterCount = countActiveFilters(filtersFromSearchParams(searchParams));
  const pendingFilterCount = countActiveFilters(tempFilters);

  React.useEffect(() => {
    setTempFilters(filtersFromSearchParams(new URLSearchParams(searchParamsString)));
  }, [searchParamsString]);

  const handleApplyFilters = () => {
    const newParams = new URLSearchParams(searchParamsString);
    filterParamKeys.forEach((key) => newParams.delete(key));

    if (tempFilters.sort && tempFilters.sort !== 'newest') newParams.set('sort', tempFilters.sort);
    if (!hasFixedCategory && tempFilters.category && tempFilters.category !== 'all')
      newParams.set('category', tempFilters.category);
    if (tempFilters.tags.size > 0) newParams.set('tags', Array.from(tempFilters.tags).join(','));
    if (tempFilters.pricing) newParams.set('pricing', tempFilters.pricing);
    if (tempFilters.platforms.size > 0)
      newParams.set('platforms', Array.from(tempFilters.platforms).join(','));

    newParams.delete('page');
    const query = newParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    trackEvent('filters_apply', {
      filter_count: pendingFilterCount,
      page_path: pathname,
      has_search: Boolean(searchParams.get('search')),
    });
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const newParams = new URLSearchParams(searchParamsString);
    filterParamKeys.forEach((key) => newParams.delete(key));
    newParams.delete('page');

    const query = newParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setTempFilters(filtersFromSearchParams(newParams));
    trackEvent('filters_clear', {
      page_path: pathname,
      preserved_search: Boolean(newParams.get('search')),
    });
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full px-3 text-xs sm:h-9 sm:w-auto sm:text-sm"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filtrele
          {appliedFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {appliedFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[92vw] max-w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtreler</SheetTitle>
          <SheetDescription>
            Sonuçları daraltmak için aşağıdaki filtreleri kullanın.
          </SheetDescription>
        </SheetHeader>
        {hasFixedCategory && (
          <div className="mt-4 rounded-lg border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
            Bu kategori sayfasındasın; temizleme işlemi kategori bağlamını korur, yalnızca arama,
            sıralama ve ek filtreleri kaldırır.
          </div>
        )}
        <div className="py-4 space-y-6">
          {!hasFixedCategory && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Kategori</Label>
                <CategorySelect
                  categories={categories}
                  value={tempFilters.category}
                  onValueChange={(v) => setTempFilters((f) => ({ ...f, category: v }))}
                />
              </div>
            </>
          )}
          <Separator />
          <div className="space-y-2">
            <Label>Sıralama</Label>
            <SortSelect
              value={tempFilters.sort}
              onValueChange={(v) => setTempFilters((f) => ({ ...f, sort: v }))}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Etiketler</Label>
            <TagFilter
              allTags={allTags}
              selectedTags={tempFilters.tags}
              onTagToggle={(tagId) =>
                setTempFilters((f) => {
                  const newTags = new Set(f.tags);
                  if (newTags.has(tagId)) newTags.delete(tagId);
                  else newTags.add(tagId);
                  return { ...f, tags: newTags };
                })
              }
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Gelişmiş</Label>
            <AdvancedFilters
              selectedPricing={tempFilters.pricing}
              selectedPlatforms={tempFilters.platforms}
              onFiltersChange={(filters) => setTempFilters((f) => ({ ...f, ...filters }))}
            />
          </div>
        </div>
        <SheetFooter className="gap-2 pb-4">
          <Button type="button" variant="ghost" onClick={handleClearFilters}>
            {hasFixedCategory ? 'Ek filtreleri temizle' : 'Filtreleri temizle'}
          </Button>
          <Button onClick={handleApplyFilters}>
            Filtreleri uygula
            {pendingFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingFilterCount}
              </Badge>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
