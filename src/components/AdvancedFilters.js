"use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";

const pricingModels = [
  "Ücretsiz",
  "Freemium",
  "Abonelik",
  "Tek Seferlik Ödeme",
];
const platformOptions = [
  "Web",
  "iOS",
  "Android",
  "Windows",
  "macOS",
  "Linux",
  "Chrome Uzantısı",
];

export function AdvancedFilters({
  selectedPricing,
  selectedPlatforms,
  onFiltersChange,
}) {
  const activeFilterCount = (selectedPricing ? 1 : 0) + selectedPlatforms.size;

  const handlePlatformChange = (platform) => {
    const newPlatforms = new Set(selectedPlatforms);
    if (newPlatforms.has(platform)) newPlatforms.delete(platform);
    else newPlatforms.add(platform);
    onFiltersChange({ platforms: newPlatforms });
  };

  const handlePricingChange = (pricing) => {
    onFiltersChange({ pricing: selectedPricing === pricing ? "" : pricing });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-full border-dashed"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Gelişmiş
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-4" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Fiyatlandırma</p>
            {pricingModels.map((model) => (
              <div key={model} className="flex items-center space-x-2">
                <Checkbox
                  id={`price-${model}`}
                  checked={selectedPricing === model}
                  onCheckedChange={() => handlePricingChange(model)}
                />
                <Label htmlFor={`price-${model}`} className="font-normal">
                  {model}
                </Label>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">Platform</p>
            {platformOptions.map((platform) => (
              <div key={platform} className="flex items-center space-x-2">
                <Checkbox
                  id={`platform-${platform}`}
                  checked={selectedPlatforms.has(platform)}
                  onCheckedChange={() => handlePlatformChange(platform)}
                />
                <Label htmlFor={`platform-${platform}`} className="font-normal">
                  {platform}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
