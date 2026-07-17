'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { PlusCircle } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// DB filter values stay Turkish; labels are translated.
const PRICING_OPTIONS = [
  { value: 'Ücretsiz', pricingKey: 'free' },
  { value: 'Freemium', pricingKey: 'freemium' },
  { value: 'Abonelik', pricingKey: 'subscription' },
  { value: 'Tek Seferlik Ödeme', pricingKey: 'oneTime' },
];

const PLATFORM_OPTIONS = [
  { value: 'Web', label: 'Web' },
  { value: 'iOS', label: 'iOS' },
  { value: 'Android', label: 'Android' },
  { value: 'Windows', label: 'Windows' },
  { value: 'macOS', label: 'macOS' },
  { value: 'Linux', label: 'Linux' },
  { value: 'Chrome Uzantısı', labelKey: 'platformChromeExt' },
];

export function AdvancedFilters({ selectedPricing, selectedPlatforms, onFiltersChange }) {
  const t = useTranslations('Homepage');
  const tp = useTranslations('Pricing');
  const activeFilterCount = (selectedPricing ? 1 : 0) + selectedPlatforms.size;

  const handlePlatformChange = (platform) => {
    const newPlatforms = new Set(selectedPlatforms);
    if (newPlatforms.has(platform)) newPlatforms.delete(platform);
    else newPlatforms.add(platform);
    onFiltersChange({ platforms: newPlatforms });
  };

  const handlePricingChange = (pricing) => {
    onFiltersChange({ pricing: selectedPricing === pricing ? '' : pricing });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 w-full border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('advancedFilters')}
          {activeFilterCount > 0 ? (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-4" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('pricingHeading')}</p>
            {PRICING_OPTIONS.map((model) => (
              <div key={model.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`price-${model.value}`}
                  checked={selectedPricing === model.value}
                  onCheckedChange={() => handlePricingChange(model.value)}
                />
                <Label htmlFor={`price-${model.value}`} className="font-normal">
                  {tp(model.pricingKey)}
                </Label>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('platformHeading')}</p>
            {PLATFORM_OPTIONS.map((platform) => (
              <div key={platform.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`platform-${platform.value}`}
                  checked={selectedPlatforms.has(platform.value)}
                  onCheckedChange={() => handlePlatformChange(platform.value)}
                />
                <Label htmlFor={`platform-${platform.value}`} className="font-normal">
                  {platform.labelKey ? t(platform.labelKey) : platform.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
