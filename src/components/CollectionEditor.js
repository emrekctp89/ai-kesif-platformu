'use client';

import * as React from 'react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Check, GripVertical, Trash2 } from 'lucide-react';

import { updateCollection, updateCollectionTools } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { cn } from '@/lib/utils';

function AddToolsToCollection({ allTools, selectedTools, onToolToggle }) {
  const t = useTranslations('ProfileComponents');
  const [open, setOpen] = useState(false);
  const selectedToolIds = new Set(selectedTools.map((item) => item.tool_id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-h-10 w-full justify-start">
          {t('addTool')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={t('searchTools')} />
          <CommandList>
            <CommandEmpty>{t('toolNotFound')}</CommandEmpty>
            <CommandGroup>
              {allTools.map((tool) => (
                <CommandItem key={tool.id} value={tool.name} onSelect={() => onToolToggle(tool.id)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedToolIds.has(tool.id) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {tool.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function CollectionEditor({ collection, allTools }) {
  const t = useTranslations('ProfileComponents');
  const [selectedTools, setSelectedTools] = useState(collection.collection_tools || []);
  const [isPending, setIsPending] = useState(false);

  const handleToolToggle = (toolId) => {
    setSelectedTools((prev) => {
      const isSelected = prev.some((item) => item.tool_id === toolId);
      if (isSelected) {
        return prev.filter((item) => item.tool_id !== toolId);
      }
      return [...prev, { tool_id: toolId, notes: '' }];
    });
  };

  const handleNoteChange = (toolId, notes) => {
    setSelectedTools((prev) =>
      prev.map((item) => (item.tool_id === toolId ? { ...item, notes } : item))
    );
  };

  const handleFormSubmit = async (formData) => {
    setIsPending(true);
    try {
      const collectionUpdateResult = await updateCollection(formData);
      if (collectionUpdateResult?.error) {
        toast.error(collectionUpdateResult.error);
        return;
      }

      const toolData = new FormData();
      toolData.append('collectionId', collection.id);
      toolData.append('slug', collection.slug);
      toolData.append('tools', JSON.stringify(selectedTools));

      const toolsUpdateResult = await updateCollectionTools(toolData);
      if (toolsUpdateResult?.error) {
        toast.error(toolsUpdateResult.error);
      } else {
        toast.success(t('collectionUpdated'));
      }
    } finally {
      setIsPending(false);
    }
  };

  const getToolName = (toolId) => {
    return allTools.find((tool) => tool.id === toolId)?.name || t('unknownTool');
  };

  return (
    <form action={handleFormSubmit} className="space-y-8">
      <input type="hidden" name="id" value={collection.id} />
      <input type="hidden" name="slug" value={collection.slug} />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <h2 className="text-2xl font-bold tracking-tight">{t('collectionToolsHeading')}</h2>
          <div className="space-y-4">
            {selectedTools.map((item) => (
              <Card key={item.tool_id} className="glass-panel border-border/50">
                <CardContent className="flex items-start gap-4 p-4">
                  <GripVertical
                    className="mt-2 h-5 w-5 cursor-grab text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold">{getToolName(item.tool_id)}</h3>
                    <Textarea
                      name={`notes-for-${item.tool_id}`}
                      placeholder={t('toolNotesPlaceholder')}
                      className="text-sm"
                      value={item.notes || ''}
                      onChange={(e) => handleNoteChange(item.tool_id, e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToolToggle(item.tool_id)}
                    disabled={isPending}
                    aria-label={t('delete')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <AddToolsToCollection
            allTools={allTools}
            selectedTools={selectedTools}
            onToolToggle={handleToolToggle}
          />
        </div>

        <div className="space-y-6 md:col-span-1">
          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle>{t('collectionSettings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('titleLabel')}</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={collection.title}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={collection.description}
                  placeholder={t('collectionDescPlaceholder')}
                  disabled={isPending}
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is_public"
                  name="is_public"
                  value="true"
                  defaultChecked={collection.is_public}
                  disabled={isPending}
                />
                <Label htmlFor="is_public">{t('makePublic')}</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border/50 pt-6">
        <Button type="submit" disabled={isPending} className="brand-gradient min-h-10 shadow-md">
          {isPending ? t('saving') : t('saveCollection')}
        </Button>
      </div>
    </form>
  );
}
