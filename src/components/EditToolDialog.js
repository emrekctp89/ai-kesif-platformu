"use client";

import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox"; // Checkbox'ı import ediyoruz
import { updateTool, assignTagsToTool } from "@/app/actions";
import toast from "react-hot-toast";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolVariantManager } from "./ToolVariantManager";

// Fiyatlandırma ve Platform seçeneklerini tanımlıyoruz
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
const tierOptions = ["Normal", "Pro", "Sponsorlu"]; // YENİ: Seviye seçenekleri

// Çoklu Etiket Seçim Bileşeni (Değişiklik yok)
function MultiSelectTags({ allTags, initialSelectedTags }) {
  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState(
    new Set(initialSelectedTags.map((t) => t.id))
  );
  const selectedTagObjects = allTags.filter((tag) => selectedTags.has(tag.id));
  return (
    <div className="col-span-3">
      {Array.from(selectedTags).map((tagId) => (
        <input key={tagId} type="hidden" name="tagId" value={tagId} />
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[40px]"
          >
            <div className="flex flex-wrap gap-1">
              {selectedTagObjects.length > 0
                ? selectedTagObjects.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))
                : "Etiket seç..."}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Etiket ara..." />
            <CommandList>
              <CommandEmpty>Etiket bulunamadı.</CommandEmpty>
              <CommandGroup>
                {allTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => {
                      const newSelection = new Set(selectedTags);
                      if (newSelection.has(tag.id)) {
                        newSelection.delete(tag.id);
                      } else {
                        newSelection.add(tag.id);
                      }
                      setSelectedTags(newSelection);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedTags.has(tag.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Ana Düzenleme Penceresi
export function EditToolDialog({ tool, categories, allTags }) {
  const [isOpen, setIsOpen] = useState(false);

  // Bu fonksiyon artık sadece ana araç bilgilerini ve etiketleri güncelliyor.
  // Varyantlar kendi içlerinde yönetilecek.
  const handleFormAction = async (formData) => {
    const toolUpdateResult = await updateTool(formData);
    if (toolUpdateResult?.error) {
      toast.error(toolUpdateResult.error);
      return;
    }
    const tagAssignResult = await assignTagsToTool(formData);
    if (tagAssignResult?.error) {
      toast.error(tagAssignResult.error);
    } else {
      toast.success("Araç ve etiketleri başarıyla güncellendi.");
      // Varyantlar ayrı kaydedildiği için pencereyi kapatmıyoruz
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Düzenle
        </Button>
      </DialogTrigger>
      {/* DEĞİŞİKLİK: Pencereyi daha geniş yapıyoruz (max-w-3xl) */}
      <DialogContent className="sm:max-w-3xl">
        {" "}
        <DialogHeader>
          <DialogTitle>{tool.name} Aracını Düzenle</DialogTitle>
          <DialogDescription>
            Aracın bilgilerini, etiketlerini ve diğer detaylarını güncelleyin.
          </DialogDescription>
        </DialogHeader>
        <form
          action={handleFormAction}
          className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4"
        >
          <input type="hidden" name="toolId" value={tool.id} />
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              İsim
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={tool.name}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="link" className="text-right">
              Link
            </Label>
            <Input
              id="link"
              name="link"
              defaultValue={tool.link}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Açıklama
            </Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={tool.description}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category_id" className="text-right">
              Kategori
            </Label>
            <select
              name="category_id"
              id="category_id"
              defaultValue={tool.category_id}
              required
              className="col-span-3 mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          {/* YENİ: Fiyatlandırma Modeli */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pricing_model" className="text-right">
              Fiyatlandırma
            </Label>
            <select
              name="pricing_model"
              id="pricing_model"
              defaultValue={tool.pricing_model || ""}
              className="col-span-3 mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Seçilmedi</option>
              {pricingModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
          {/* YENİ: Desteklenen Platformlar */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Platformlar</Label>
            <div className="col-span-3 grid grid-cols-2 gap-2">
              {platformOptions.map((platform) => (
                <div key={platform} className="flex items-center space-x-2">
                  <Checkbox
                    id={`platform-${platform}`}
                    name="platforms"
                    value={platform}
                    defaultChecked={tool.platforms?.includes(platform)}
                  />
                  <Label
                    htmlFor={`platform-${platform}`}
                    className="text-sm font-normal"
                  >
                    {platform}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">
              Etiketler
            </Label>
            <MultiSelectTags
              allTags={allTags}
              initialSelectedTags={tool.tool_tags.map((tt) => tt.tags)}
            />
          </div>
          {/* YENİ: Araç Seviyesi */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tier" className="text-right">
              Seviye
            </Label>
            <select
              name="tier"
              id="tier"
              defaultValue={tool.tier || "Normal"}
              required
              className="col-span-3 mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {tierOptions.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
            {/* YENİ: Varyant Yönetim Paneli */}
            <ToolVariantManager tool={tool} />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                İptal
              </Button>
            </DialogClose>
            <Button type="submit">Değişiklikleri Kaydet</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
