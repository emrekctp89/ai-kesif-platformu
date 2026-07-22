'use client';

import * as React from 'react';
import { useState, useMemo, useTransition } from 'react';
import { updatePost, assignToolsToPost, assignTagsToPost, uploadBlogImage } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), {
  ssr: false,
});
import 'easymde/dist/easymde.min.css';
import 'font-awesome/css/font-awesome.min.css';

// Ã‡oklu SeÃ§im BileÅŸenleri (Bunlar iÃ§in src/components altÄ±nda ayrÄ± dosyalar oluÅŸturulabilir)
function MultiSelect({ items, selectedIds, onSelectionChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const selectedObjects = items.filter((item) => selectedIds.has(item.id));
  const handleSelect = (itemId) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(itemId)) newSelection.delete(itemId);
    else newSelection.add(itemId);
    onSelectionChange(newSelection);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between h-auto min-h-[40px]"
        >
          <div className="flex flex-wrap gap-1">
            {selectedObjects.length > 0
              ? selectedObjects.map((item) => (
                  <Badge key={item.id} variant="secondary">
                    {item.name}
                  </Badge>
                ))
              : placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Ara..." />
          <CommandList>
            <CommandEmpty>BulunamadÄ±.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem key={item.id} value={item.name} onSelect={() => handleSelect(item.id)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedIds.has(item.id) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Ana YazÄ± EditÃ¶r BileÅŸeni
export function PostEditor({ post, allTools, allTags, allCategories }) {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState(post.content || '');
  const [selectedTools, setSelectedTools] = useState(
    new Set(post.post_tools.map((pt) => pt.tools.id))
  );
  const [selectedTags, setSelectedTags] = useState(new Set(post.post_tags.map((pt) => pt.tags.id)));

  const editorOptions = useMemo(
    () => ({
      spellChecker: false,
      placeholder: 'YazÄ±nÄ±zÄ± buraya yazmaya baÅŸlayÄ±n...',
      toolbar: [
        'bold',
        'italic',
        'heading',
        '|',
        'quote',
        'unordered-list',
        'ordered-list',
        '|',
        'link',
        'image',
        '|',
        'preview',
        'side-by-side',
        'fullscreen',
      ],
      uploadImage: true,
      imageUploadFunction: (file, onSuccess, onError) => {
        const formData = new FormData();
        formData.append('image', file);
        toast.promise(
          uploadBlogImage(formData).then((result) => {
            if (result.success) {
              onSuccess(result.url);
              return 'GÃ¶rsel baÅŸarÄ±yla yÃ¼klendi!';
            } else {
              throw new Error(result.error);
            }
          }),
          {
            loading: 'YÃ¼kleniyor...',
            success: (msg) => msg,
            error: (err) => `Hata: ${err.message}`,
          }
        );
      },
    }),
    []
  );

  const handleFormSubmit = async (formData) => {
    formData.set('content', content);

    const toolsFormData = new FormData();
    toolsFormData.append('postId', post.id);
    selectedTools.forEach((id) => toolsFormData.append('toolId', id));

    const tagsFormData = new FormData();
    tagsFormData.append('postId', post.id);
    selectedTags.forEach((id) => tagsFormData.append('tagId', id));

    startTransition(async () => {
      const [postResult, toolsResult, tagsResult] = await Promise.all([
        updatePost(formData),
        assignToolsToPost(toolsFormData),
        assignTagsToPost(tagsFormData),
      ]);
      if (postResult.error || toolsResult.error || tagsResult.error) {
        toast.error(
          postResult.error || toolsResult.error || tagsResult.error || 'Bir hata oluÅŸtu.'
        );
      } else {
        toast.success('YazÄ± ve iliÅŸkili iÃ§erikler baÅŸarÄ±yla gÃ¼ncellendi.');
      }
    });
  };

  return (
    <form action={handleFormSubmit} className="space-y-6">
      <input type="hidden" name="id" value={post.id} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">BaÅŸlÄ±k</Label>
            <Input id="title" name="title" defaultValue={post.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">KÄ±sa AÃ§Ä±klama</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={post.description}
              className="min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Ä°Ã§erik (Markdown)</Label>
            <SimpleMDE options={editorOptions} value={content} onChange={setContent} />
          </div>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>YayÄ±n AyarlarÄ±</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">URL UzantÄ±sÄ±</Label>
                <Input id="slug" name="slug" defaultValue={post.slug} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Durum</Label>
                <select
                  name="status"
                  id="status"
                  defaultValue={post.status}
                  required
                  className="w-full mt-1 block pl-3 pr-10 py-2.5 text-base border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option>Taslak</option>
                  <option>YayÄ±nlandÄ±</option>
                  <option>ArÅŸivlendi</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">YazÄ± Tipi</Label>
                <select
                  name="type"
                  id="type"
                  defaultValue={post.type}
                  className="w-full mt-1 block pl-3 pr-10 py-2.5 text-base border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option>Blog</option>
                  <option>Makale</option>
                  <option>Rehber</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Organizasyon KartÄ± sadece Rehber ve Makaleler iÃ§in gÃ¶rÃ¼nÃ¼r */}
          {(post.type === 'Rehber' || post.type === 'Makale') && (
            <Card>
              <CardHeader>
                <CardTitle>Organizasyon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <select
                    name="category_id"
                    defaultValue={post.category_id}
                    className="w-full mt-1 block pl-3 pr-10 py-2.5 text-base border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Kategori Yok</option>
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Etiketler</Label>
                  <MultiSelect
                    items={allTags}
                    selectedIds={selectedTags}
                    onSelectionChange={setSelectedTags}
                    placeholder="Etiket SeÃ§..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Ä°liÅŸkili AraÃ§lar</CardTitle>
            </CardHeader>
            <CardContent>
              <MultiSelect
                items={allTools}
                selectedIds={selectedTools}
                onSelectionChange={setSelectedTools}
                placeholder="AraÃ§ SeÃ§..."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-6 border-t">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Kaydediliyor...' : 'DeÄŸiÅŸiklikleri Kaydet'}
        </Button>
        {/* DEÄÄ°ÅÄ°KLÄ°K: "Ã–nizle" butonu artÄ±k yeni ve gÃ¼venli Ã¶nizleme sayfasÄ±na gidiyor */}
        <Button variant="outline" asChild>
          <a href={`/admin/posts/${post.id}/preview`} target="_blank">
            Ã–nizle
          </a>
        </Button>
      </div>
    </form>
  );
}
