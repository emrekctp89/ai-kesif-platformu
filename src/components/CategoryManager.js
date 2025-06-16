'use client'

// React import'unu dosyanın en başına ekliyoruz.
import * as React from 'react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { addCategory, updateCategory, deleteCategory } from '@/app/actions'
import toast from 'react-hot-toast'


// Kategori Düzenleme Formu
function EditCategoryDialog({ category }) {
    const [isOpen, setIsOpen] = useState(false);
  
    const handleFormAction = async (formData) => {
      const result = await updateCategory(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Kategori başarıyla güncellendi.");
        setIsOpen(false);
      }
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Düzenle</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Kategoriyi Düzenle</DialogTitle>
          </DialogHeader>
          <form action={handleFormAction} className="grid gap-4 py-4">
              <input type="hidden" name="id" value={category.id} />
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Yeni İsim</Label>
                  <Input id="name" name="name" defaultValue={category.name} className="col-span-3" required />
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="secondary">İptal</Button></DialogClose>
                  <Button type="submit">Güncelle</Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
}

// Kategori Silme Butonu
function DeleteCategoryButton({ categoryId }) {
    const handleFormAction = async (formData) => {
        const result = await deleteCategory(formData);
        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success("Kategori ve içindeki araçlar silindi.");
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">Sil</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Bu işlem geri alınamaz. Bu kategoriyi sildiğinizde, bu kategoriye ait TÜM ARAÇLAR da kalıcı olarak silinecektir.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                    <form action={handleFormAction}>
                        <input type="hidden" name="id" value={categoryId} />
                        <AlertDialogAction type="submit">Evet, Sil</AlertDialogAction>
                    </form>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


// Ana Kategori Yönetim Bileşeni
export function CategoryManager({ categories }) {
  const formRef = React.useRef(null);

  const handleAddCategory = async (formData) => {
    const result = await addCategory(formData);
    if (result?.error) {
        toast.error(result.error);
    } else {
        toast.success("Yeni kategori eklendi.");
        formRef.current?.reset();
    }
  }

  return (
    <div className="space-y-6">
        {/* Yeni Kategori Ekleme Formu */}
        <div>
            <h3 className="text-lg font-medium mb-2">Yeni Kategori Ekle</h3>
            <form ref={formRef} action={handleAddCategory} className="flex items-center gap-2">
                <Label htmlFor="new-category-name" className="sr-only">Kategori Adı</Label>
                <Input id="new-category-name" name="name" placeholder="Yeni kategori adı..." required />
                <Button type="submit">Ekle</Button>
            </form>
        </div>

        <hr className="border-border" />

        {/* Mevcut Kategoriler Listesi */}
        <div>
            <h3 className="text-lg font-medium mb-2">Mevcut Kategoriler</h3>
            <div className="space-y-2">
                {categories.map((category) => (
                    <div key={category.id} className="p-3 rounded-lg border flex justify-between items-center">
                        <p className="font-medium">{category.name}</p>
                        <div className="flex items-center gap-2">
                            <EditCategoryDialog category={category} />
                            <DeleteCategoryButton categoryId={category.id} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  )
}
