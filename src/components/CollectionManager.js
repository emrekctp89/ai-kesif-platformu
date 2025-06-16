"use client";

import * as React from "react";
import { useTransition } from "react"; // useTransition'ı import ediyoruz
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
import { createCollection, deleteCollection } from "@/app/actions";
import toast from "react-hot-toast";

// Koleksiyon Silme Butonu (Değişiklik yok)
function DeleteCollectionButton({ collectionId }) {
  const handleFormAction = async (formData) => {
    const result = await deleteCollection(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Koleksiyon başarıyla silindi.");
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
            Bu işlem geri alınamaz. Bu koleksiyon ve içindeki tüm araçlar kalıcı
            olarak silinecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="id" value={collectionId} />
            <AlertDialogAction type="submit">Evet, Sil</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Ana Koleksiyon Yönetim Bileşeni
export function CollectionManager({ collections }) {
  const formRef = React.useRef(null);
  // DEĞİŞİKLİK: Yükleme durumunu yönetmek için useTransition kullanıyoruz
  const [isPending, startTransition] = useTransition();

  const handleCreateCollection = (formData) => {
    // Sunucu eylemini startTransition ile sarmalıyoruz
    startTransition(async () => {
      const result = await createCollection(formData);
      // Artık sadece hata durumunda bir bildirim gösteriyoruz.
      // Başarılı durumda zaten yönlendirme olacak.
      if (result?.error) {
        toast.error(result.error);
      }
      // toast.loading ve toast.dismiss kaldırıldı.
    });
  };

  return (
    <div className="space-y-6">
      {/* Yeni Koleksiyon Ekleme Formu */}
      <div>
        <h3 className="text-lg font-medium mb-2">Yeni Koleksiyon Oluştur</h3>
        <form
          ref={formRef}
          action={handleCreateCollection}
          className="flex items-center gap-2"
        >
          <Label htmlFor="new-collection-title" className="sr-only">
            Koleksiyon Başlığı
          </Label>
          <Input
            id="new-collection-title"
            name="title"
            placeholder="Yeni koleksiyon başlığı..."
            required
            disabled={isPending}
          />
          {/* DEĞİŞİKLİK: Buton artık yükleme durumunu kendi üzerinde gösteriyor */}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Oluşturuluyor..." : "Oluştur & Düzenle"}
          </Button>
        </form>
      </div>

      <hr className="border-border" />

      {/* Mevcut Koleksiyonlar Listesi */}
      <div>
        <h3 className="text-lg font-medium mb-2">Koleksiyonlarım</h3>
        <div className="space-y-2">
          {collections.length > 0 ? (
            collections.map((collection) => (
              <div
                key={collection.id}
                className="p-3 rounded-lg border flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{collection.title}</p>
                  <Badge
                    variant={collection.is_public ? "default" : "secondary"}
                  >
                    {collection.is_public ? "Herkese Açık" : "Gizli"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/profile/collections/${collection.id}/edit`}>
                      Düzenle
                    </Link>
                  </Button>
                  <DeleteCollectionButton collectionId={collection.id} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Henüz hiç koleksiyon oluşturmadınız.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
