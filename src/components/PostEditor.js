"use client";

import * as React from "react";
import { useState, useMemo, useTransition } from "react";
import {
  updatePost,
  assignToolsToPost,
  assignTagsToPost,
  uploadBlogImage,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
});
import "easymde/dist/easymde.min.css";

// Çoklu Seçim Bileşenleri (Bunlar için src/components altında ayrı dosyalar oluşturulabilir)
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
            <CommandEmpty>Bulunamadı.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => handleSelect(item.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIds.has(item.id) ? "opacity-100" : "opacity-0"
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

// Ana Yazı Editör Bileşeni
export function PostEditor({ post, allTools, allTags, allCategories }) {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState(post.content || "");
  const [selectedTools, setSelectedTools] = useState(
    new Set(post.post_tools.map((pt) => pt.tools.id))
  );
  const [selectedTags, setSelectedTags] = useState(
    new Set(post.post_tags.map((pt) => pt.tags.id))
  );

  const editorOptions = useMemo(
    () => ({
      spellChecker: false,
      placeholder: "Yazınızı buraya yazmaya başlayın...",
      toolbar: [
        "bold",
        "italic",
        "heading",
        "|",
        "quote",
        "unordered-list",
        "ordered-list",
        "|",
        "link",
        "image",
        "|",
        "preview",
        "side-by-side",
        "fullscreen",
      ],
      uploadImage: true,
      imageUploadFunction: (file, onSuccess, onError) => {
        const formData = new FormData();
        formData.append("image", file);
        toast.promise(
          uploadBlogImage(formData).then((result) => {
            if (result.success) {
              onSuccess(result.url);
              return "Görsel başarıyla yüklendi!";
            } else {
              throw new Error(result.error);
            }
          }),
          {
            loading: "Yükleniyor...",
            success: (msg) => msg,
            error: (err) => `Hata: ${err.message}`,
          }
        );
      },
    }),
    []
  );

  const handleFormSubmit = async (formData) => {
    formData.set("content", content);

    const toolsFormData = new FormData();
    toolsFormData.append("postId", post.id);
    selectedTools.forEach((id) => toolsFormData.append("toolId", id));

    const tagsFormData = new FormData();
    tagsFormData.append("postId", post.id);
    selectedTags.forEach((id) => tagsFormData.append("tagId", id));

    startTransition(async () => {
      const [postResult, toolsResult, tagsResult] = await Promise.all([
        updatePost(formData),
        assignToolsToPost(toolsFormData),
        assignTagsToPost(tagsFormData),
      ]);
      if (postResult.error || toolsResult.error || tagsResult.error) {
        toast.error(
          postResult.error ||
            toolsResult.error ||
            tagsResult.error ||
            "Bir hata oluştu."
        );
      } else {
        toast.success("Yazı ve ilişkili içerikler başarıyla güncellendi.");
      }
    });
  };

  return (
    <form action={handleFormSubmit} className="space-y-6">
      <input type="hidden" name="id" value={post.id} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Başlık</Label>
            <Input id="title" name="title" defaultValue={post.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Kısa Açıklama</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={post.description}
              className="min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <Label>İçerik (Markdown)</Label>
            <SimpleMDE
              options={editorOptions}
              value={content}
              onChange={setContent}
            />
          </div>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Yayın Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">URL Uzantısı</Label>
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={post.slug}
                  required
                />
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
                  <option>Yayınlandı</option>
                  <option>Arşivlendi</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Yazı Tipi</Label>
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

          {/* Organizasyon Kartı sadece Rehber ve Makaleler için görünür */}
          {(post.type === "Rehber" || post.type === "Makale") && (
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
                    placeholder="Etiket Seç..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>İlişkili Araçlar</CardTitle>
            </CardHeader>
            <CardContent>
              <MultiSelect
                items={allTools}
                selectedIds={selectedTools}
                onSelectionChange={setSelectedTools}
                placeholder="Araç Seç..."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-6 border-t">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </Button>
        {/* DEĞİŞİKLİK: "Önizle" butonu artık yeni ve güvenli önizleme sayfasına gidiyor */}
        <Button variant="outline" asChild>
          <a href={`/admin/posts/${post.id}/preview`} target="_blank">
            Önizle
          </a>
        </Button>
      </div>
    </form>
  );
}
