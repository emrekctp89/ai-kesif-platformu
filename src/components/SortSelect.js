'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SortSelect({ value, onValueChange }) {
  const t = useTranslations('Homepage');
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full md:w-[180px]">
        <SelectValue placeholder={t('sortPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="newest">{t('sortNewest')}</SelectItem>
          <SelectItem value="rating">{t('sortRating')}</SelectItem>
          <SelectItem value="popularity">{t('sortPopularity')}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
