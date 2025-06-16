"use client";

import * as React from "react";
import { useTransition, useState } from "react";
import { updatePost, togglePostPublish } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";

// Yayınlama anahtarını ve onay diyaloğunu yöneten alt bileşen
function PublishToggle({ postId, isPublished }) {
  const [isPending, startTransition] = useTransition();
  // Onay diyaloğunun açık olup olmadığını kontrol eden state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Anahtara basıldığında çalışacak fonksiyon
  const handleCheckedChange = (checked) => {
    // Eğer kullanıcı "Yayınla" seçeneğini aktif ediyorsa,
    // hemen işlemi yapma, önce onay diyaloğunu göster.
    if (checked) {
      setShowConfirmDialog(true);
    } else {
      // Eğer yayından kaldırıyorsa, onaya gerek yok, işlemi direkt yap.
      handleToggle(false);
    }
  };

  // Asıl veritabanı işlemini yapan fonksiyon
  const handleToggle = (checked) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("postId", postId);
      formData.append("isPublished", checked);
      const result = await togglePostPublish(formData);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.success);
      }
    });
  };

  return (
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <div className="flex items-center space-x-2">
        <Switch
          id="publish-switch"
          checked={isPublished}
          onCheckedChange={handleCheckedChange} // Artık bu fonksiyonu çağırıyor
          disabled={isPending}
        />
        <Label htmlFor="publish-switch" className="text-sm font-medium">
          {isPublished ? "Yayınlandı" : "Taslak"}
        </Label>
      </div>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Yazıyı Yayınlamak Üzeresiniz</AlertDialogTitle>
          <AlertDialogDescription>
            Bu yazıyı yayınlamak istediğinize emin misiniz? Bu işlemden sonra
            yazı tüm ziyaretçiler tarafından görülebilir hale gelecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          {/* Onay butonuna basıldığında işlemi gerçekleştir */}
          <AlertDialogAction onClick={() => handleToggle(true)}>
            Evet, Yayınla
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Ana Yazı Editör Bileşeni
export function PostEditor({ post }) {
  const handleUpdatePost = async (formData) => {
    const result = await updatePost(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Değişiklikler başarıyla kaydedildi.");
    }
  };

  return (
    <form action={handleUpdatePost} className="space-y-8">
      <input type="hidden" name="id" value={post.id} />
      <input type="hidden" name="slug" value={post.slug} />

      {/* Ana Yazma Alanı */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-xl">
            Başlık
          </Label>
          <Input
            id="title"
            name="title"
            defaultValue={post.title}
            required
            className="text-2xl h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" className="text-lg">
            Kısa Açıklama
          </Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={post.description}
            placeholder="Blog listeleme sayfasında görünecek özet..."
            className="min-h-[100px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="featured_image_url" className="text-lg">
            Öne Çıkan Görsel URL'i
          </Label>
          <Input
            id="featured_image_url"
            name="featured_image_url"
            defaultValue={post.featured_image_url}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="content" className="text-lg">
            İçerik (Markdown)
          </Label>
          <Textarea
            id="content"
            name="content"
            defaultValue={post.content}
            className="min-h-[70vh] font-mono text-base"
          />
        </div>
      </div>

      {/* YENİ: Yayınlama Kartı */}
      <Card>
        <CardHeader>
          <CardTitle>Yayın Durumu</CardTitle>
          <CardDescription>
            Bu anahtarı açtığınızda, yazı tüm kullanıcılar tarafından
            görülebilir hale gelecektir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PublishToggle
            postId={post.id}
            isPublished={post.status === "Yayınlandı"}
          />
        </CardContent>
      </Card>

      {/* DEĞİŞİKLİK: Üst kontrol bölümü en aşağıya taşındı */}
      <div className="flex justify-end items-center gap-4 p-4 border-t sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button variant="outline" asChild>
          <a
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Önizle
          </a>
        </Button>
        <Button type="submit">Değişiklikleri Kaydet</Button>
      </div>
    </form>
  );
}
