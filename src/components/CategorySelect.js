'use client';

import { getCategoryLabel } from '@/lib/categoryLocalization';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CategorySelect({ categories, value, onValueChange }) {
  const locale = useLocale();
  const t = useTranslations('Homepage');
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full md:w-[280px]">
        <SelectValue placeholder={t('categoryPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{t('categoriesLabel')}</SelectLabel>
          <SelectItem value="all">{t('allCategories')}</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.slug} value={category.slug}>
              {getCategoryLabel(category, locale)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
