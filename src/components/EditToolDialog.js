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
import { TranslateButton } from '@/components/TranslateButton';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

// Fiyatlandırma ve Platform seçeneklerini tanımlıyoruz
const pricingModels = [
  { value: 'Ücretsiz', key: 'free' },
  { value: 'Freemium', key: 'freemium' },
  { value: 'Abonelik', key: 'subscription' },
  { value: 'Tek Seferlik Ödeme', key: 'oneTime' },
];
const platformOptions = [
  { value: 'Web', label: 'Web' },
  { value: 'iOS', label: 'iOS' },
  { value: 'Android', label: 'Android' },
  { value: 'Windows', label: 'Windows' },
  { value: 'macOS', label: 'macOS' },
  { value: 'Linux', label: 'Linux' },
  { value: 'Chrome Uzantısı', key: 'chromeExtension' },
];
const tierOptions = [
  { value: 'Normal', key: 'tierNormal' },
  { value: 'Pro', key: 'tierPro' },
  { value: 'Sponsorlu', key: 'tierSponsored' },
];

function MultiSelectTags({ allTags, initialSelectedTags, t }) {
  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState(new Set(initialSelectedTags.map((t) => t.id)));
  const selectedTagObjects = allTags.filter((tag) => selectedTags.has(tag.id));
  return (
    <div className="col-span-3">
      {Array.from(selectedTags).map((tagId) => (
        <input key={tagId} type="hidden" name="tagId" value={tagId} />
      ))}
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            type="button"
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
                : t('selectTags')}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={t('searchTags')} />
            <CommandList>
              <CommandEmpty>{t('noTagsFound')}</CommandEmpty>
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
  const locale = useLocale();
  const t = useTranslations('ToolEditor');
  const tPricing = useTranslations('Pricing');
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(tool.name || '');
  const [link, setLink] = useState(tool.link || '');
  const [linkDecision, setLinkDecision] = useState('keep');
  const [description, setDescription] = useState(tool.description || '');
  const [nameEn, setNameEn] = useState(tool.name_en || '');
  const [descriptionEn, setDescriptionEn] = useState(tool.description_en || '');
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
    { label: t('qualityName'), passed: name.trim().length >= 2 },
    { label: t('qualityLink'), passed: parsedLink },
    { label: t('qualityDescription'), passed: description.trim().length >= 80 },
    { label: t('qualityPricing'), passed: Boolean(pricingModel) },
    { label: t('qualityPlatform'), passed: selectedPlatforms.size > 0 },
  ];
  const passedCheckCount = qualityChecks.filter((check) => check.passed).length;
  const qualityProgress = (passedCheckCount / qualityChecks.length) * 100;
  const canSave = name.trim().length >= 2 && parsedLink && !isSaving;

  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (open) {
      setName(tool.name || '');
      setLink(tool.link || '');
      setLinkDecision('keep');
      setDescription(tool.description || '');
      setNameEn(tool.name_en || '');
      setDescriptionEn(tool.description_en || '');
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

      const linkStatus = toolUpdateResult?.linkCheck?.status;
      if (linkStatus === 'invalid') {
        toast.error(toolUpdateResult.success || t('savedLinkStillBroken'));
      } else if (linkStatus === 'review') {
        toast(toolUpdateResult.success || t('savedLinkNeedsReview'), { icon: '⚠️' });
      } else {
        toast.success(toolUpdateResult.success || t('savedSuccessfully'));
      }
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
          {t('edit')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {t('title', { name: locale === 'en' ? nameEn || tool.name : tool.name })}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <form
          action={handleFormAction}
          className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4"
        >
          <input type="hidden" name="toolId" value={tool.id} />
          <section className="rounded-lg border bg-muted/30 p-3" aria-label={t('qualityCheck')}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {t('qualityScore', {
                    passed: passedCheckCount,
                    total: qualityChecks.length,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">{t('qualityHint')}</p>
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
              {t('name')}
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
              {t('link')}
            </Label>
            <div className="col-span-3">
              <Input
                id={`link-${tool.id}`}
                name="link"
                value={link}
                onChange={(event) => {
                  setLink(event.target.value);
                  setLinkDecision('keep');
                }}
                className={cn(!parsedLink && link && 'border-destructive')}
                maxLength={2048}
                aria-invalid={Boolean(link) && !parsedLink}
                required
              />
              <div className="mt-3 space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">
                  {t('linkCheck')}:{' '}
                  {tool.link_check_status === 'manual_valid'
                    ? t('linkManuallyApproved')
                    : tool.link_check_status === 'invalid'
                      ? t('linkFlaggedBroken')
                      : tool.link_check_status === 'review'
                        ? t('linkNeedsReview')
                        : tool.link_check_status === 'valid'
                          ? t('linkValid')
                          : t('linkNotChecked')}
                </p>
                {tool.link_check_error && (
                  <p className="text-xs text-muted-foreground">{tool.link_check_error}</p>
                )}
                {parsedLink && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                  >
                    {t('openAndCheckLink')} ↗
                  </a>
                )}
                <Label htmlFor={`link-decision-${tool.id}`} className="block">
                  {t('adminDecision')}
                </Label>
                <select
                  id={`link-decision-${tool.id}`}
                  name="linkDecision"
                  value={linkDecision}
                  onChange={(event) => setLinkDecision(event.target.value)}
                  className="w-full rounded-md border bg-background p-2 text-sm"
                >
                  <option value="keep">{t('keepDecision')}</option>
                  <option value="manual_valid">{t('approveLinkManually')}</option>
                  <option value="automatic">{t('runAutomaticCheck')}</option>
                </select>
                <p className="text-xs text-muted-foreground">{t('manualApprovalHint')}</p>
              </div>
              {link && !parsedLink && (
                <p className="mt-1 text-xs text-destructive">{t('invalidUrl')}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor={`description-${tool.id}`} className="pt-2 text-right">
              {t('toolDescription')}
            </Label>
            <div className="col-span-3">
              <div className="mb-2 flex justify-end">
                <TranslateButton
                  size="sm"
                  getText={() => description}
                  onTranslated={setDescription}
                  label={t('translateDescription')}
                />
              </div>
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
                    ? t('descriptionTooShort')
                    : t('descriptionLengthOk')}
                </span>
                <span>{description.length}/1200</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`name-en-${tool.id}`} className="text-right">
              {t('nameEn')}
            </Label>
            <div className="col-span-3 space-y-2">
              <div className="flex justify-end">
                <TranslateButton
                  size="sm"
                  targetLanguage="en"
                  getText={() => name}
                  onTranslated={setNameEn}
                  label={t('translateNameEn')}
                />
              </div>
              <Input
                id={`name-en-${tool.id}`}
                name="name_en"
                value={nameEn}
                onChange={(event) => setNameEn(event.target.value)}
                maxLength={100}
                placeholder={t('englishNamePlaceholder')}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor={`description-en-${tool.id}`} className="pt-2 text-right">
              {t('descriptionEn')}
            </Label>
            <div className="col-span-3">
              <div className="mb-2 flex justify-end">
                <TranslateButton
                  size="sm"
                  targetLanguage="en"
                  getText={() => description}
                  onTranslated={setDescriptionEn}
                  label={t('translateDescriptionEn')}
                />
              </div>
              <Textarea
                id={`description-en-${tool.id}`}
                name="description_en"
                value={descriptionEn}
                onChange={(event) => setDescriptionEn(event.target.value)}
                className="min-h-24"
                maxLength={1200}
                placeholder={t('englishDescriptionPlaceholder')}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category_id" className="text-right">
              {t('category')}
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
          {tool.category_note ? (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="category_note" className="text-right pt-2">
                {t('categoryNote')}
              </Label>
              <Textarea
                id="category_note"
                name="category_note"
                defaultValue={tool.category_note || ''}
                maxLength={200}
                className="col-span-3 min-h-16"
                placeholder={t('categoryNotePlaceholder')}
              />
            </div>
          ) : null}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pricing_model" className="text-right">
              {t('pricingModel')}
            </Label>
            <select
              name="pricing_model"
              id="pricing_model"
              value={pricingModel}
              onChange={(event) => setPricingModel(event.target.value)}
              className="col-span-3 mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t('notSelected')}</option>
              {pricingModels.map((model) => (
                <option key={model.value} value={model.value}>
                  {tPricing(model.key)}
                </option>
              ))}
            </select>
          </div>
          {/* YENİ: Desteklenen Platformlar */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">{t('platforms')}</Label>
            <div className="col-span-3 grid grid-cols-2 gap-2">
              {platformOptions.map((platform) => (
                <div key={platform.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`platform-${platform.value}`}
                    name="platforms"
                    value={platform.value}
                    checked={selectedPlatforms.has(platform.value)}
                    onCheckedChange={(checked) =>
                      setSelectedPlatforms((current) => {
                        const next = new Set(current);
                        if (checked) next.add(platform.value);
                        else next.delete(platform.value);
                        return next;
                      })
                    }
                  />
                  <Label htmlFor={`platform-${platform.value}`} className="text-sm font-normal">
                    {platform.key ? t(platform.key) : platform.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">
              {t('tags')}
            </Label>
            <MultiSelectTags
              allTags={allTags}
              initialSelectedTags={(tool.tool_tags || []).map((tt) => tt.tags).filter(Boolean)}
              t={t}
            />
          </div>
          {/* YENİ: Araç Seviyesi */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tier" className="text-right">
              {t('tier')}
            </Label>
            <select
              name="tier"
              id="tier"
              defaultValue={tool.tier || 'Normal'}
              required
              className="col-span-3 mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {tierOptions.map((tier) => (
                <option key={tier.value} value={tier.value}>
                  {t(tier.key)}
                </option>
              ))}
            </select>
            {/* YENİ: Varyant Yönetim Paneli */}
            <ToolVariantManager tool={tool} />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                {t('cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!canSave}>
              {isSaving ? (
                <>
                  <LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('saveChanges')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
