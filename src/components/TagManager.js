'use client'

import * as React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { addTag, deleteTag } from '@/app/actions'
import toast from 'react-hot-toast'

export function TagManager({ tags }) {
  const formRef = React.useRef(null);

  const handleAddTag = async (formData) => {
    const result = await addTag(formData);
    if (result?.error) {
        toast.error(result.error);
    } else {
        toast.success("Yeni etiket eklendi.");
        formRef.current?.reset();
    }
  }
  
  const handleDeleteTag = async (formData) => {
    const result = await deleteTag(formData);
    if (result?.error) {
        toast.error(result.error);
    } else {
        toast.success("Etiket silindi.");
    }
  }

  return (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-medium mb-2">Yeni Etiket Ekle</h3>
            <form ref={formRef} action={handleAddTag} className="flex items-center gap-2">
                <Input id="new-tag-name" name="name" placeholder="Yeni etiket adı (örn: #ücretsiz)" required />
                <Button type="submit">Ekle</Button>
            </form>
        </div>

        <hr className="border-border" />

        <div>
            <h3 className="text-lg font-medium mb-2">Mevcut Etiketler</h3>
            {tags && tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary" className="flex items-center gap-2">
                            {tag.name}
                            <form action={handleDeleteTag}>
                                <input type="hidden" name="id" value={tag.id} />
                                <button type="submit" className="ml-1 font-bold hover:text-destructive">×</button>
                            </form>
                        </Badge>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">Henüz etiket eklenmemiş.</p>
            )}
        </div>
    </div>
  )
}
