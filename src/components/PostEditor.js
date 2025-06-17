"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { updatePost, uploadBlogImage } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";

// Gelişmiş editörümüzü, sadece istemci tarafında yüklenecek şekilde dinamik olarak import ediyoruz.
import dynamic from "next/dynamic";
const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
});
import "easymde/dist/easymde.min.css"; // Editörün temel stilleri

export function PostEditor({ post }) {
  // Yazının içeriğini anlık olarak takip etmek için bir state kullanıyoruz.
  const [content, setContent] = useState(post.content || "");

  // Editörün seçeneklerini ve görsel yükleme mantığını burada tanımlıyoruz
  const editorOptions = useMemo(() => {
    return {
      spellChecker: false,
      placeholder: "Yazınızı buraya yazmaya başlayın...",
      // Zengin bir araç çubuğu
      toolbar: [
        "bold",
        "italic",
        "strikethrough",
        "heading",
        "|",
        "quote",
        "unordered-list",
        "ordered-list",
        "|",
        "link",
        "image",
        "table",
        "|",
        "preview",
        "side-by-side",
        "fullscreen",
        "|",
        "guide",
      ],
      // Görsel yükleme fonksiyonu
      uploadImage: true,
      imageUploadFunction: (file, onSuccess, onError) => {
        const formData = new FormData();
        formData.append("image", file);

        toast.promise(
          uploadBlogImage(formData).then((result) => {
            if (result.success && result.url) {
              onSuccess(result.url);
              return "Görsel başarıyla yüklendi!";
            } else {
              throw new Error(result.error || "Bilinmeyen bir hata oluştu.");
            }
          }),
          {
            loading: "Görsel yükleniyor...",
            success: (msg) => msg,
            error: (err) => `Yükleme başarısız: ${err.message}`,
          }
        );
      },
    };
  }, []);

  const handleFormSubmit = async (formData) => {
    // Form gönderilmeden önce, en güncel içeriği state'ten alıp forma ekliyoruz.
    formData.set("content", content);
    const result = await updatePost(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Yazı başarıyla güncellendi.");
    }
  };

  return (
    <form action={handleFormSubmit} className="space-y-6">
      <input type="hidden" name="id" value={post.id} />
      <input type="hidden" name="slug" value={post.slug} />
      <input
        type="hidden"
        name="was_published_before"
        value={post.status === "Yayınlandı"}
      />

      <div className="space-y-2">
        <Label htmlFor="title">Başlık</Label>
        <Input id="title" name="title" defaultValue={post.title} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Kısa Açıklama (Özet)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={post.description}
          placeholder="Blog listeleme sayfasında görünecek kısa bir özet..."
          maxLength="250"
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label>İçerik</Label>
        {/* Gelişmiş editörümüz */}
        <SimpleMDE
          options={editorOptions}
          value={content}
          onChange={setContent}
        />
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Label htmlFor="status-switch">Durum</Label>
          <p className="text-sm text-muted-foreground">
            Yazıyı yayınlamak veya taslak olarak kaydetmek için kullanın.
          </p>
        </div>
        <select
          name="status"
          id="status-switch"
          defaultValue={post.status}
          required
          className="w-auto block pl-3 pr-10 py-2.5 text-base border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option>Taslak</option>
          <option>Yayınlandı</option>
          <option>Arşivlendi</option>
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">Değişiklikleri Kaydet</Button>
        <Button variant="outline" asChild>
          <a href={`/admin/blog/${post.id}/preview`} target="_blank">
            Önizle
          </a>
        </Button>
      </div>
    </form>
  );
}
