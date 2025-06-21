"use client";

import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { PlusCircle } from "lucide-react";

// Koleksiyon Silme Butonu
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

// Yeni Koleksiyon Oluşturma Penceresi
function CreateCollectionDialog() {
  const formRef = React.useRef(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCreateCollection = (formData) => {
    startTransition(async () => {
      const result = await createCollection(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(
          "Koleksiyon oluşturuldu, düzenleme sayfasına yönlendiriliyorsunuz..."
        );
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Koleksiyon
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Koleksiyon Oluştur</DialogTitle>
          <DialogDescription>
            Koleksiyonunuza akılda kalıcı bir başlık verin. Daha sonra içine
            araçlar ekleyebilirsiniz.
          </DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          action={handleCreateCollection}
          className="space-y-4 py-2"
        >
          <div className="space-y-2">
            <Label htmlFor="new-collection-title">Koleksiyon Başlığı</Label>
            <Input
              id="new-collection-title"
              name="title"
              placeholder="Örn: En İyi Ücretsiz Tasarım Araçları"
              required
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                İptal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Oluşturuluyor..." : "Oluştur & Düzenle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Ana Koleksiyon Yönetim Bileşeni
export function CollectionManager({ collections }) {
  return (
    <div className="space-y-6">
      {/* DEĞİŞİKLİK: "Yeni Koleksiyon" butonu artık listenin üzerinde */}
      <div className="flex justify-end">
        <CreateCollectionDialog />
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
            <p className="text-sm text-muted-foreground text-center py-4">
              Henüz hiç koleksiyon oluşturmadınız.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
