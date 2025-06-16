"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createPost, deletePost } from "@/app/actions";
import toast from "react-hot-toast";

// Yazı Silme Butonu
function DeletePostButton({ post }) {
  const handleFormAction = async (formData) => {
    const result = await deletePost(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Yazı başarıyla silindi.");
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Sil
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem geri alınamaz. "{post.title}" başlıklı yazı kalıcı olarak
            silinecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="id" value={post.id} />
            <input type="hidden" name="slug" value={post.slug} />
            <AlertDialogAction type="submit">Evet, Sil</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Ana Blog Yönetim Bileşeni
export function BlogManager({ posts }) {
  const formRef = React.useRef(null);

  const handleCreatePost = async (formData) => {
    // Bu fonksiyon doğrudan formun action'ına bağlı olduğu için
    // toast bildirimini burada yönetmek yerine, redirect sonrası
    // düzenleme sayfasında bir mesaj gösterebiliriz.
    const result = await createPost(formData);
    if (result?.error) {
      toast.error(result.error);
    }
    // Başarılı olursa, `createPost` zaten yönlendirme yapıyor.
  };

  return (
    <div className="space-y-6">
      {/* Yeni Yazı Oluşturma Formu */}
      <div>
        <h3 className="text-lg font-medium mb-2">Yeni Yazı Oluştur</h3>
        <form
          ref={formRef}
          action={handleCreatePost}
          className="flex items-center gap-2"
        >
          <Label htmlFor="new-post-title" className="sr-only">
            Yazı Başlığı
          </Label>
          <Input
            id="new-post-title"
            name="title"
            placeholder="Yeni yazı başlığı..."
            required
          />
          <Button type="submit">Oluştur & Düzenle</Button>
        </form>
      </div>

      <hr className="border-border" />

      {/* Mevcut Yazılar Listesi */}
      <div>
        <h3 className="text-lg font-medium mb-2">Mevcut Yazılar</h3>
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="p-3 rounded-lg border flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{post.title}</p>
                <Badge variant={post.is_published ? "default" : "secondary"}>
                  {post.is_published ? "Yayınlandı" : "Taslak"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/blog/${post.id}/edit`}>Düzenle</Link>
                </Button>
                <DeletePostButton post={post} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
