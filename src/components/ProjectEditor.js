"use client";

import * as React from "react";
import { useState } from "react";
import { updateProject, updateProjectItems } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";
// Yeni AI bileşenini import ediyoruz
import { AiProjectStrategist } from "./AiProjectStrategist";
import { Badge } from "@/components/ui/badge";

// Projeye içerik eklemek için kullanılan çoklu seçim bileşeni
function AddItemToProject({ items, onSelect, typeName }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {typeName} Ekle...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Ara..." />
          <CommandList>
            <CommandEmpty>İçerik bulunamadı.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.title || item.name}
                  onSelect={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}
                >
                  {item.title || item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Ana Proje Editör Bileşeni
export function ProjectEditor({
  project,
  allTools,
  allShowcaseItems,
  allPrompts,
}) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [items, setItems] = useState(project.project_items || []);

  const handleAddItem = (itemId, itemType) => {
    if (items.some((i) => i.item_id === itemId && i.item_type === itemType)) {
      toast.error("Bu içerik zaten projede mevcut.");
      return;
    }
    setItems((prev) => [...prev, { item_id: itemId, item_type: itemType }]);
  };

  const handleRemoveItem = (itemId, itemType) => {
    setItems((prev) =>
      prev.filter((i) => !(i.item_id === itemId && i.item_type === itemType))
    );
  };

  const getItemDetails = (itemId, itemType) => {
    if (itemType === "tool") return allTools.find((t) => t.id === itemId);
    if (itemType === "showcase_item")
      return allShowcaseItems.find((s) => s.id === itemId);
    if (itemType === "prompt") return allPrompts.find((p) => p.id === itemId);
    return null;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("id", project.id);
    formData.append("title", title);
    formData.append("description", description);

    const updateResult = await updateProject(formData);
    if (updateResult?.error) {
      toast.error(updateResult.error);
      return;
    }

    const itemsFormData = new FormData();
    itemsFormData.append("projectId", project.id);
    itemsFormData.append("items", JSON.stringify(items));

    const itemsResult = await updateProjectItems(itemsFormData);
    if (itemsResult?.error) {
      toast.error(itemsResult.error);
    } else {
      toast.success("Proje başarıyla güncellendi.");
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8">
      <input type="hidden" name="id" value={project.id} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sol Sütun: Proje İçerikleri */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold">Proje İçerikleri</h2>
          <div className="space-y-4">
            {items.map((item) => {
              const details = getItemDetails(item.item_id, item.item_type);
              if (!details) return null;

              return (
                <Card key={`${item.item_type}-${item.item_id}`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <Badge variant="secondary" className="mb-1">
                        {item.item_type.replace("_", " ")}
                      </Badge>
                      <p className="font-semibold">
                        {details.title || details.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleRemoveItem(item.item_id, item.item_type)
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <AddItemToProject
              items={allTools}
              onSelect={(id) => handleAddItem(id, "tool")}
              typeName="Araç"
            />
            <AddItemToProject
              items={allShowcaseItems}
              onSelect={(id) => handleAddItem(id, "showcase_item")}
              typeName="Eser"
            />
            <AddItemToProject
              items={allPrompts}
              onSelect={(id) => handleAddItem(id, "prompt")}
              typeName="Prompt"
            />
          </div>
        </div>

        {/* Sağ Sütun: Proje Detayları ve AI Stratejisti */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Proje Detayları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Proje Başlığı</Label>
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Proje Açıklaması</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Bu proje ne hakkında?"
                />
              </div>
            </CardContent>
          </Card>

          {/* YENİ: AI Stratejist bileşenini buraya ekliyoruz */}
          <AiProjectStrategist projectId={project.id} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-6 border-t">
        <Button type="submit">Değişiklikleri Kaydet</Button>
      </div>
    </form>
  );
}
