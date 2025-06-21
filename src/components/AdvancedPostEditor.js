"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { updatePost, assignToolsToPost, assignTagsToPost } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// DÜZELTME: Eksik olan Card import'larını ekliyoruz
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelectTools } from "./MultiSelectTools"; // Yardımcı bileşen
import { MultiSelectTags } from "./MultiSelectTags"; // Yardımcı bileşen
import toast from "react-hot-toast";
import dynamic from "next/dynamic";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
});
import "easymde/dist/easymde.min.css";

export function AdvancedPostEditor({ post, allTools, allTags, categories }) {
  const [content, setContent] = useState(post.content || "");
  const [selectedTools, setSelectedTools] = useState(
    new Set(post.post_tools.map((pt) => pt.tools.id))
  );
  const [selectedTags, setSelectedTags] = useState(
    new Set(post.post_tags.map((pt) => pt.tags.id))
  );

  const editorOptions = useMemo(() => ({ spellChecker: false }), []);

  const handleFormSubmit = async (formData) => {
    formData.set("content", content);

    const toolsFormData = new FormData();
    toolsFormData.append("postId", post.id);
    selectedTools.forEach((id) => toolsFormData.append("toolId", id));

    const tagsFormData = new FormData();
    tagsFormData.append("postId", post.id);
    selectedTags.forEach((id) => tagsFormData.append("tagId", id));

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
      toast.success(
        "Yazı, ilişkili araçlar ve etiketler başarıyla güncellendi."
      );
    }
  };

  return (
    <form action={handleFormSubmit} className="space-y-6">
      <input type="hidden" name="id" value={post.id} />
      <input type="hidden" name="slug" value={post.slug} />

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
                  <option>Makale</option>
                  <option>Rehber</option>
                  <option>Blog</option>
                </select>
              </div>
            </CardContent>
          </Card>
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
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <MultiSelectTags
                allTags={allTags}
                selectedTags={selectedTags}
                onSelectionChange={setSelectedTags}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>İlişkili Araçlar</CardTitle>
            </CardHeader>
            <CardContent>
              <MultiSelectTools
                allTools={allTools}
                selectedTools={selectedTools}
                onSelectionChange={setSelectedTools}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-6 border-t">
        <Button type="submit">Değişiklikleri Kaydet</Button>
      </div>
    </form>
  );
}
