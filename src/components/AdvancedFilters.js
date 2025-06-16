"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

export function AdvancedFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedPricing = searchParams.get("pricing") || "";
  const selectedPlatforms = React.useMemo(() => {
    const platforms = searchParams.get("platforms");
    return new Set(platforms ? platforms.split(",") : []);
  }, [searchParams]);

  const handleFilterChange = () => {
    // Bu fonksiyon doğrudan form gönderimi ile tetiklenecek
    // ve URL'i güncelleyecek. Ayrı bir state yönetimine gerek yok.
    // Form elemanlarının kendileri state'i tutacak.
  };

  const activeFilterCount = (selectedPricing ? 1 : 0) + selectedPlatforms.size;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-full md:w-auto border-dashed"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Gelişmiş Filtreler
          {activeFilterCount > 0 && (
            <>
              <div className="mx-2 h-4 w-px bg-muted-foreground" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal"
              >
                {activeFilterCount} aktif
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <form
          // Formdaki herhangi bir değişiklik URL'i güncelleyecek şekilde ayarlanabilir,
          // ama şimdilik bir "Uygula" butonu ile manuel yapacağız.
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const newParams = new URLSearchParams(searchParams.toString());

            const pricing = formData.get("pricing");
            if (pricing) {
              newParams.set("pricing", pricing);
            } else {
              newParams.delete("pricing");
            }

            const platforms = formData.getAll("platforms");
            if (platforms.length > 0) {
              newParams.set("platforms", platforms.join(","));
            } else {
              newParams.delete("platforms");
            }

            newParams.delete("page");
            router.push(`/?${newParams.toString()}`);
          }}
        >
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Fiyatlandırma</p>
              {pricingModels.map((model) => (
                <div key={model} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`price-${model}`}
                    name="pricing"
                    value={model}
                    defaultChecked={selectedPricing === model}
                    className="h-4 w-4"
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
                    name="platforms"
                    value={platform}
                    defaultChecked={selectedPlatforms.has(platform)}
                  />
                  <Label
                    htmlFor={`platform-${platform}`}
                    className="font-normal"
                  >
                    {platform}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="p-2 border-t flex justify-end gap-2">
            <Button
              type="reset"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
            >
              Temizle
            </Button>
            <Button type="submit" size="sm">
              Uygula
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
