"use client";

import * as React from "react";
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
import { Button } from "@/components/ui/button";
import { deleteShowcaseItem } from "@/app/actions";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { AddShowcaseItemDialog } from "./AddShowcaseItemDialog";
// Yeni Düzenleme bileşenini import ediyoruz
import { EditShowcaseItemDialog } from "./EditShowcaseItemDialog";

// Eser Silme Butonu
function DeleteShowcaseItemButton({ item }) {
  const handleFormAction = async (formData) => {
    const result = await deleteShowcaseItem(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Eser başarıyla silindi.");
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
            Bu işlem geri alınamaz. "{item.title}" başlıklı eseriniz kalıcı
            olarak silinecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="imageUrl" value={item.image_url} />
            <AlertDialogAction type="submit">Evet, Sil</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Ana Eser Yönetim Bileşeni
export function ShowcaseManager({ items }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AddShowcaseItemDialog />
      </div>
      <hr className="border-border" />
      <div className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <span className="text-xs font-mono text-muted-foreground">
                      {item.content_type}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p
                    className={`text-sm ${item.is_approved ? "text-green-500" : "text-yellow-500"}`}
                  >
                    {item.is_approved ? "Onaylandı" : "Onay Bekliyor"}
                  </p>
                </div>
              </div>
              {/* DEĞİŞİKLİK: Yeni butonları ekliyoruz */}
              <div className="flex items-center gap-2">
                <EditShowcaseItemDialog item={item} />
                <DeleteShowcaseItemButton item={item} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Henüz hiç eser paylaşmadınız.
          </p>
        )}
      </div>
    </div>
  );
}
