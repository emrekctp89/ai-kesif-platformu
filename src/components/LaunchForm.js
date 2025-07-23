/*
 * ---------------------------------------------------
 * 1. YENİ BİLEŞEN: src/components/LaunchForm.js
 * Bu, yeni bir lansman gönderme formunu yöneten interaktif
 * istemci bileşenidir.
 * ---------------------------------------------------
 */
"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitLaunch } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Check, ChevronsUpDown, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export function LaunchForm({ userTools }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedToolId, setSelectedToolId] = React.useState(null);
  const [imagePreviews, setImagePreviews] = React.useState([]);
  const formRef = React.useRef(null);

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const handleFormAction = (formData) => {
    if (!selectedToolId) {
      toast.error("Lütfen lansmanını yapacağınız aracı seçin.");
      return;
    }
    formData.append("toolId", selectedToolId);

    startTransition(async () => {
      const result = await submitLaunch(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        router.push("/launchpad");
      }
    });
  };

  return (
    <form ref={formRef} action={handleFormAction} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="tool" className="text-lg font-semibold">
          Lansmanı Yapılacak Araç *
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full md:w-[400px] justify-between"
            >
              {selectedToolId
                ? userTools.find((t) => t.id === selectedToolId)?.name
                : "Bir araç seçin..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput placeholder="Araç ara..." />
              <CommandList>
                <CommandEmpty>
                  Lansmanı yapılabilecek aracınız bulunmuyor.
                </CommandEmpty>
                <CommandGroup>
                  {userTools.map((tool) => (
                    <CommandItem
                      key={tool.id}
                      value={tool.name}
                      onSelect={() => setSelectedToolId(tool.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedToolId === tool.id
                            ? "opacity-100"
                            : "opacity-0"
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline" className="text-lg font-semibold">
          Slogan (Tagline) *
        </Label>
        <Input
          id="tagline"
          name="tagline"
          placeholder="Örn: Hayal gücünüzü saniyeler içinde görsellere dönüştürün."
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-lg font-semibold">
          Detaylı Açıklama
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Aracınızın ne yaptığını, hangi sorunu çözdüğünü ve neden özel olduğunu anlatın..."
          className="min-h-[150px]"
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="galleryImages" className="text-lg font-semibold">
          Galeri Görselleri
        </Label>
        <Input
          id="galleryImages"
          name="galleryImages"
          type="file"
          multiple
          onChange={handleImageChange}
          disabled={isPending}
          accept="image/*"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {imagePreviews.map((src, index) => (
            <img
              key={index}
              src={src}
              className="h-20 w-20 object-cover rounded-md border"
              alt="Önizleme"
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="youtube_video_url" className="text-lg font-semibold">
          YouTube Tanıtım Videosu (İsteğe Bağlı)
        </Label>
        <Input
          id="youtube_video_url"
          name="youtube_video_url"
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={isPending}
        />
      </div>

      <div className="flex justify-end pt-6 border-t">
        <Button type="submit" size="lg" disabled={isPending}>
          <Rocket className="mr-2 h-5 w-5" />
          {isPending ? "Gönderiliyor..." : "Lansmanı Onaya Gönder"}
        </Button>
      </div>
    </form>
  );
}
