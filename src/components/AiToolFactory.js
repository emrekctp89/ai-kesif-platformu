"use client";

import * as React from "react";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generateToolsWithAi } from "@/app/actions";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";

export function AiToolFactory({ categories }) {
  const [isPending, startTransition] = useTransition();
  const [selectedCategory, setSelectedCategory] = React.useState(null);

  const handleGenerate = () => {
    if (!selectedCategory) {
      toast.error("Lütfen önce bir kategori seçin.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("categoryId", selectedCategory.id);
      formData.append("categoryName", selectedCategory.name);

      const result = await generateToolsWithAi(formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${result.count} yeni araç bulundu ve onaya eklendi!`);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          AI İçerik Fabrikası
        </CardTitle>
        <CardDescription>
          Bir kategori seçin ve yapay zekanın sizin için yeni araçlar keşfedip
          onaya sunmasını sağlayın.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            onValueChange={(value) => setSelectedCategory(JSON.parse(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Bir kategori seçin..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {categories.map((category) => (
                  <SelectItem
                    key={category.id}
                    value={JSON.stringify(category)}
                  >
                    {category.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            onClick={handleGenerate}
            disabled={isPending || !selectedCategory}
            className="w-full sm:w-auto"
          >
            {isPending ? "Üretiliyor..." : "Araçları Üret"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
