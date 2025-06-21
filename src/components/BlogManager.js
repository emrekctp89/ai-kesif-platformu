"use client";

import * as React from "react";
import { useTransition } from "react"; // useTransition'ı import ediyoruz
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { PlusCircle } from "lucide-react";

// ✅ Yazı Silme Butonu
function DeletePostButton({ post }) {
  const handleClick = async () => {
    const formData = new FormData();
    formData.set("id", post.id);

    toast.loading("Siliniyor...");
    const result = await deletePost(formData);
    toast.dismiss();

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Yazı başarıyla silindi.");
    }
  };

  return (
    <Button onClick={handleClick} variant="destructive" size="sm">
      Sil
    </Button>
  );
}

// Akıllı "Yeni Yazı" Butonu
function CreateNewPostMenu() {
  const formRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  // DEĞİŞİKLİK: Yükleme durumunu yönetmek için useTransition kullanıyoruz
  const [isPending, startTransition] = useTransition();

  const handleCreate = (event) => {
    event.preventDefault();
    const formData = new FormData(formRef.current);
    const type = event.nativeEvent.submitter.value;
    formData.set("type", type);

    // Sunucu eylemini startTransition ile sarmalıyoruz.
    // Bu, işlem sırasında arayüzün donmasını engeller ve 'isPending'i günceller.
    startTransition(async () => {
      const result = await createPost(formData);
      if (result?.error) {
        toast.error(result.error);
      }
      // Başarılı olursa, 'createPost' zaten yönlendirme yapıyor.
      // Artık toast.loading veya toast.dismiss'e gerek yok.
    });
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni İçerik Ekle
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>
          Ne tür bir içerik oluşturmak istiyorsunuz?
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form ref={formRef} onSubmit={handleCreate} className="p-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-post-title">Yeni İçerik Başlığı</Label>
            <Input
              id="new-post-title"
              name="title"
              placeholder="Yeni başlık..."
              required
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-2">
            {/* DEĞİŞİKLİK: Butonlar artık 'isPending' durumuna göre kendi kendini yönetiyor */}
            <Button
              type="submit"
              name="type"
              value="Blog"
              variant="secondary"
              size="sm"
              disabled={isPending}
            >
              {isPending ? "..." : "Blog Yazısı Oluştur"}
            </Button>
            <Button
              type="submit"
              name="type"
              value="Rehber"
              size="sm"
              disabled={isPending}
            >
              {isPending ? "..." : "Rehber Oluştur"}
            </Button>
          </div>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ✅ Ana Bileşen
export function BlogManager({ posts }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CreateNewPostMenu />
      </div>

      <hr className="border-border" />

      <div className="space-y-2">
        <h3 className="text-lg font-medium mb-2">Mevcut Yazılar</h3>
        <div className="space-y-2">
          {posts.map((post) => {
            const isPublished = post.status === "Yayınlandı";
            // DEĞİŞİKLİK: editUrl artık her zaman yeni, merkezi sayfayı işaret ediyor.
            const editUrl = `/admin/posts/${post.id}/edit`;

            return (
              <div
                key={post.id}
                className="p-3 rounded-lg border flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{post.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={isPublished ? "default" : "secondary"}>
                      {post.status}
                    </Badge>
                    <Badge variant="outline">{post.type}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={editUrl}>Düzenle</Link>
                  </Button>
                  <DeletePostButton post={post} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
