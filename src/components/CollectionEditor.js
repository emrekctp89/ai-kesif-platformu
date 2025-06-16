"use client";

import * as React from "react";
import { useState } from "react";
import { updateCollection, updateCollectionTools } from "@/app/actions";
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
import { Check, ChevronsUpDown, GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// Koleksiyona Araç Ekleme/Seçme Bileşeni
function AddToolsToCollection({
  allTools,
  selectedTools,
  onToolToggle,
  onNoteChange,
}) {
  const [open, setOpen] = useState(false);
  const selectedToolIds = new Set(selectedTools.map((t) => t.tool_id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          Araç Ekle...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Araç ara..." />
          <CommandList>
            <CommandEmpty>Araç bulunamadı.</CommandEmpty>
            <CommandGroup>
              {allTools.map((tool) => (
                <CommandItem
                  key={tool.id}
                  value={tool.name}
                  onSelect={() => onToolToggle(tool.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedToolIds.has(tool.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {tool.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Ana Koleksiyon Editör Bileşeni
export function CollectionEditor({ collection, allTools }) {
  const [selectedTools, setSelectedTools] = useState(
    collection.collection_tools || []
  );

  const handleToolToggle = (toolId) => {
    setSelectedTools((prev) => {
      const isSelected = prev.some((t) => t.tool_id === toolId);
      if (isSelected) {
        return prev.filter((t) => t.tool_id !== toolId);
      } else {
        return [...prev, { tool_id: toolId, notes: "" }];
      }
    });
  };

  const handleNoteChange = (toolId, notes) => {
    setSelectedTools((prev) =>
      prev.map((t) => (t.tool_id === toolId ? { ...t, notes } : t))
    );
  };

  const handleFormSubmit = async (formData) => {
    // 1. Koleksiyon detaylarını güncelle
    const collectionUpdateResult = await updateCollection(formData);
    if (collectionUpdateResult?.error) {
      toast.error(collectionUpdateResult.error);
      return;
    }

    // 2. Koleksiyondaki araçları ve notları güncelle
    const toolData = new FormData();
    toolData.append("collectionId", collection.id);
    toolData.append("slug", collection.slug);
    // Seçilen araçları ve notlarını JSON olarak gönder
    toolData.append("tools", JSON.stringify(selectedTools));

    const toolsUpdateResult = await updateCollectionTools(toolData);
    if (toolsUpdateResult?.error) {
      toast.error(toolsUpdateResult.error);
    } else {
      toast.success("Koleksiyon başarıyla güncellendi.");
    }
  };

  const getToolName = (toolId) => {
    return allTools.find((t) => t.id === toolId)?.name || "Bilinmeyen Araç";
  };

  return (
    <form action={handleFormSubmit} className="space-y-8">
      <input type="hidden" name="id" value={collection.id} />
      <input type="hidden" name="slug" value={collection.slug} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sol Sütun: Seçilen Araçlar */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold">Koleksiyondaki Araçlar</h2>
          <div className="space-y-4">
            {selectedTools.map((item) => (
              <Card key={item.tool_id}>
                <CardContent className="p-4 flex items-start gap-4">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold">
                      {getToolName(item.tool_id)}
                    </h3>
                    <Textarea
                      name={`notes-for-${item.tool_id}`}
                      placeholder="Bu araç hakkında özel notlarınız..."
                      className="text-sm"
                      value={item.notes || ""}
                      onChange={(e) =>
                        handleNoteChange(item.tool_id, e.target.value)
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToolToggle(item.tool_id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <AddToolsToCollection
            allTools={allTools}
            selectedTools={selectedTools}
            onToolToggle={handleToolToggle}
            onNoteChange={handleNoteChange}
          />
        </div>

        {/* Sağ Sütun: Ayarlar */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Koleksiyon Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Başlık</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={collection.title}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={collection.description}
                  placeholder="Bu koleksiyon ne hakkında?"
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is_public"
                  name="is_public"
                  value="true"
                  defaultChecked={collection.is_public}
                />
                <Label htmlFor="is_public">Herkese Açık Yap</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-6 border-t">
        <Button type="submit">Koleksiyonu Kaydet</Button>
      </div>
    </form>
  );
}
