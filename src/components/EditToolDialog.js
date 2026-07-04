'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { updateTool, assignTagsToTool } from '@/app/actions';
import toast from 'react-hot-toast';
import { AlertTriangle, Check, CheckCircle2, ChevronsUpDown, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolVariantManager } from './ToolVariantManager';
import { useRouter } from 'next/navigation';

// Fiyatlandırma ve Platform seçeneklerini tanımlıyoruz
const pricingModels = ['Ücretsiz', 'Freemium', 'Abonelik', 'Tek Seferlik Ödeme'];
const platformOptions = ['Web', 'iOS', 'Android', 'Windows', 'macOS', 'Linux', 'Chrome Uzantısı'];
const tierOptions = ['Normal', 'Pro', 'Sponsorlu']; // YENİ: Seviye seçenekleri

// Çoklu Etiket Seçim Bileşeni (Değişiklik yok)
function MultiSelectTags({ allTags, initialSelectedTags }) {
  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState(new Set(initialSelectedTags.map((t) => t.id)));
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
                : 'Etiket seç...'}
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
                        'mr-2 h-4 w-4',
                        selectedTags.has(tag.id) ? 'opacity-100' : 'opacity-0'
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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(tool.name || '');
  const [link, setLink] = useState(tool.link || '');
  const [description, setDescription] = useState(tool.description || '');
  const [pricingModel, setPricingModel] = useState(tool.pricing_model || '');
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Set(tool.platforms || []));

  const parsedLink = React.useMemo(() => {
    try {
      const url = new URL(link);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }, [link]);
  const qualityChecks = [
    { label: 'İsim hazır', passed: name.trim().length >= 2 },
    { label: 'Bağlantı geçerli', passed: parsedLink },
    { label: 'Açıklama yeterli', passed: description.trim().length >= 80 },
    { label: 'Fiyat bilgisi var', passed: Boolean(pricingModel) },
    { label: 'Platform seçildi', passed: selectedPlatforms.size > 0 },
  ];
  const passedCheckCount = qualityChecks.filter((check) => check.passed).length;
  const qualityProgress = (passedCheckCount / qualityChecks.length) * 100;
  const canSave = name.trim().length >= 2 && parsedLink && !isSaving;

  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (open) {
      setName(tool.name || '');
      setLink(tool.link || '');
      setDescription(tool.description || '');
      setPricingModel(tool.pricing_model || '');
      setSelectedPlatforms(new Set(tool.platforms || []));
    }
  };

  const handleFormAction = async (formData) => {
    setIsSaving(true);
    try {
      const toolUpdateResult = await updateTool(formData);
      if (toolUpdateResult?.error) {
        toast.error(toolUpdateResult.error);
        return;
      }
      const tagAssignResult = await assignTagsToTool(formData);
      if (tagAssignResult?.error) {
        toast.error(tagAssignResult.error);
        return;
      }

      toast.success('Araç ve etiketleri başarıyla güncellendi.');
      setIsOpen(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Düzenle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
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
          <section
            className="rounded-lg border bg-muted/30 p-3"
            aria-label="Veri kalitesi kontrolü"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  Veri kalitesi: {passedCheckCount}/{qualityChecks.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Zorunlu alanlar geçerli olduğunda kaydedebilirsin.
                </p>
              </div>
              <Badge variant={passedCheckCount === qualityChecks.length ? 'default' : 'secondary'}>
                %{Math.round(qualityProgress)}
              </Badge>
            </div>
            <Progress value={qualityProgress} className="mt-3" />
            <div className="mt-3 flex flex-wrap gap-2">
              {qualityChecks.map((check) => (
                <span
                  key={check.label}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs',
                    check.passed
                      ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'border-amber-500/30 text-amber-700 dark:text-amber-300'
                  )}
                >
                  {check.passed ? (
                    <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {check.label}
                </span>
              ))}
            </div>
          </section>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`name-${tool.id}`} className="text-right">
              İsim
            </Label>
            <Input
              id={`name-${tool.id}`}
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="col-span-3"
              minLength={2}
              maxLength={100}
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`link-${tool.id}`} className="text-right">
              Link
            </Label>
            <div className="col-span-3">
              <Input
                id={`link-${tool.id}`}
                name="link"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                className={cn(!parsedLink && link && 'border-destructive')}
                maxLength={2048}
                aria-invalid={Boolean(link) && !parsedLink}
                required
              />
              {link && !parsedLink && (
                <p className="mt-1 text-xs text-destructive">
                  http:// veya https:// ile başlayan geçerli bir adres girin.
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor={`description-${tool.id}`} className="pt-2 text-right">
              Açıklama
            </Label>
            <div className="col-span-3">
              <Textarea
                id={`description-${tool.id}`}
                name="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28"
                maxLength={1200}
              />
              <div className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {description.trim().length < 80
                    ? 'Kaliteli bir açıklama için en az 80 karakter önerilir.'
                    : 'Açıklama uzunluğu uygun.'}
                </span>
                <span>{description.length}/1200</span>
              </div>
            </div>
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
              value={pricingModel}
              onChange={(event) => setPricingModel(event.target.value)}
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
                    checked={selectedPlatforms.has(platform)}
                    onCheckedChange={(checked) =>
                      setSelectedPlatforms((current) => {
                        const next = new Set(current);
                        if (checked) next.add(platform);
                        else next.delete(platform);
                        return next;
                      })
                    }
                  />
                  <Label htmlFor={`platform-${platform}`} className="text-sm font-normal">
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
              initialSelectedTags={(tool.tool_tags || []).map((tt) => tt.tags).filter(Boolean)}
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
              defaultValue={tool.tier || 'Normal'}
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
            <Button type="submit" disabled={!canSave}>
              {isSaving ? (
                <>
                  <LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor…
                </>
              ) : (
                'Değişiklikleri Kaydet'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
