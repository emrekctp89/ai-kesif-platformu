'use client';

import * as React from 'react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';

import { updateProject, updateProjectItems } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { AiProjectStrategist } from './AiProjectStrategist';

function AddItemToProject({ items, onSelect, typeLabel }) {
  const t = useTranslations('ProfileComponents');
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-h-10 w-full justify-start">
          {t('addType', { type: typeLabel })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={t('searchContent')} />
          <CommandList>
            <CommandEmpty>{t('contentNotFound')}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.title || item.name}
                  onSelect={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}
                >
                  {item.title || item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ProjectEditor({ project, allTools, allShowcaseItems, allPrompts }) {
  const t = useTranslations('ProfileComponents');
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const [items, setItems] = useState(project.project_items || []);
  const [isPending, setIsPending] = useState(false);

  const handleAddItem = (itemId, itemType) => {
    if (items.some((item) => item.item_id === itemId && item.item_type === itemType)) {
      toast.error(t('itemAlreadyInProject'));
      return;
    }
    setItems((prev) => [...prev, { item_id: itemId, item_type: itemType }]);
  };

  const handleRemoveItem = (itemId, itemType) => {
    setItems((prev) =>
      prev.filter((item) => !(item.item_id === itemId && item.item_type === itemType))
    );
  };

  const getItemDetails = (itemId, itemType) => {
    if (itemType === 'tool') return allTools.find((tool) => tool.id === itemId);
    if (itemType === 'showcase_item') return allShowcaseItems.find((item) => item.id === itemId);
    if (itemType === 'prompt') return allPrompts.find((prompt) => prompt.id === itemId);
    return null;
  };

  const itemTypeKeys = {
    tool: 'itemType_tool',
    showcase_item: 'itemType_showcase_item',
    prompt: 'itemType_prompt',
  };

  const getItemTypeLabel = (itemType) => {
    const key = itemTypeKeys[itemType];
    return key ? t(key) : itemType.replaceAll('_', ' ');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append('id', project.id);
      formData.append('title', title);
      formData.append('description', description);

      const updateResult = await updateProject(formData);
      if (updateResult?.error) {
        toast.error(updateResult.error);
        return;
      }

      const itemsFormData = new FormData();
      itemsFormData.append('projectId', project.id);
      itemsFormData.append('items', JSON.stringify(items));

      const itemsResult = await updateProjectItems(itemsFormData);
      if (itemsResult?.error) {
        toast.error(itemsResult.error);
      } else {
        toast.success(t('projectUpdated'));
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8">
      <input type="hidden" name="id" value={project.id} />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <h2 className="text-2xl font-bold tracking-tight">{t('projectItemsHeading')}</h2>
          <div className="space-y-4">
            {items.map((item) => {
              const details = getItemDetails(item.item_id, item.item_type);
              if (!details) return null;

              return (
                <Card
                  key={`${item.item_type}-${item.item_id}`}
                  className="glass-panel border-border/50"
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <Badge variant="secondary" className="mb-1">
                        {getItemTypeLabel(item.item_type)}
                      </Badge>
                      <p className="font-semibold">{details.title || details.name}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.item_id, item.item_type)}
                      disabled={isPending}
                      aria-label={t('delete')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <AddItemToProject
              items={allTools}
              onSelect={(id) => handleAddItem(id, 'tool')}
              typeLabel={t('typeTool')}
            />
            <AddItemToProject
              items={allShowcaseItems}
              onSelect={(id) => handleAddItem(id, 'showcase_item')}
              typeLabel={t('typeShowcaseItem')}
            />
            <AddItemToProject
              items={allPrompts}
              onSelect={(id) => handleAddItem(id, 'prompt')}
              typeLabel={t('typePrompt')}
            />
          </div>
        </div>

        <div className="space-y-6 md:col-span-1">
          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle>{t('projectDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('projectTitleLabel')}</Label>
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('projectDescLabel')}</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('projectDescPlaceholder')}
                  disabled={isPending}
                />
              </div>
            </CardContent>
          </Card>

          <AiProjectStrategist projectId={project.id} />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border/50 pt-6">
        <Button type="submit" disabled={isPending} className="brand-gradient min-h-10 shadow-md">
          {isPending ? t('saving') : t('saveChanges')}
        </Button>
      </div>
    </form>
  );
}
