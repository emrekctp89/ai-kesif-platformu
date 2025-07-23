"use client";

import * as React from "react";
import { useTransition } from "react";
import {
  generateToolVariants,
  updateToolVariants,
  applyWinningVariant,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle } from "lucide-react";

export function ToolVariantManager({ tool }) {
  const [variants, setVariants] = React.useState(
    tool.tool_variants.filter((v) => !v.is_original)
  );
  const [isGenerating, startGeneratingTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();

  const originalVariant = tool.tool_variants.find((v) => v.is_original) || {
    title: tool.name,
    description: tool.description,
  };

  // AI ile yeni varyantlar üreten fonksiyon
  const handleGenerateVariants = () => {
    startGeneratingTransition(async () => {
      const result = await generateToolVariants(tool.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        // Mevcut varyantların üzerine yazmak yerine, yenilerini ekliyoruz.
        setVariants((prev) => [
          ...prev,
          ...result.data.map((v) => ({ ...v, is_active: false })),
        ]);
        toast.success("3 yeni varyant üretildi!");
      }
    });
  };

  // Bir varyantın "aktif" durumunu değiştiren fonksiyon
  const handleToggleActive = (index) => {
    const newVariants = [...variants];
    newVariants[index].is_active = !newVariants[index].is_active;
    setVariants(newVariants);
  };

  // Değişiklikleri kaydeden ana form eylemi
  const handleSaveChanges = async () => {
    startSavingTransition(async () => {
      const formData = new FormData();
      formData.append("toolId", tool.id);
      formData.append("variants", JSON.stringify(variants));
      const result = await updateToolVariants(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
      }
    });
  };

  const handleApplyWinner = (variant) => {
    if (
      !confirm(
        `"${variant.title}" varyantını bu aracın yeni ana başlığı yapmak istediğinize emin misiniz? Bu işlem, diğer tüm varyantları silecek ve testi sonlandıracaktır.`
      )
    ) {
      return;
    }
    startSavingTransition(async () => {
      const formData = new FormData();
      formData.append("toolId", tool.id);
      formData.append("newTitle", variant.title);
      formData.append("newDescription", variant.description);
      const result = await applyWinningVariant(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        // Arayüzü güncellemek için sayfayı yenilemek en basit yol
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-4 pt-4 mt-4 border-t">
      <h4 className="font-semibold">A/B Testi Varyantları</h4>

      {/* İstatistik Tablosu */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Varyant</TableHead>
              <TableHead>Gösterim</TableHead>
              <TableHead>Tıklanma</TableHead>
              <TableHead>CTR (%)</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {originalVariant && (
              <TableRow>
                <TableCell className="font-medium">
                  {originalVariant.title} (Orijinal)
                </TableCell>
                <TableCell>{originalVariant.impressions || "-"}</TableCell>
                <TableCell>{originalVariant.clicks || "-"}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right">-</TableCell>
              </TableRow>
            )}

            {/* Diğer Varyantların Satırları */}
            {variants.map((variant, index) => {
              const ctr =
                variant.impressions > 0
                  ? ((variant.clicks / variant.impressions) * 100).toFixed(2)
                  : 0;
              return (
                <TableRow key={index}>
                  <TableCell className="font-medium">{variant.title}</TableCell>
                  <TableCell>{variant.impressions}</TableCell>
                  <TableCell>{variant.clicks}</TableCell>
                  <TableCell>{ctr}%</TableCell>
                  <TableCell>
                    <Switch
                      checked={variant.is_active}
                      onCheckedChange={() => handleToggleActive(index)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyWinner(variant)}
                      disabled={isSaving}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Kazanan Yap
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Eylem Butonları */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleGenerateVariants}
          disabled={isGenerating}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isGenerating ? "Üretiliyor..." : "AI ile Varyant Üret"}
        </Button>
        <Button onClick={handleSaveChanges} disabled={isSaving}>
          {isSaving ? "Kaydediliyor..." : "Aktif/Pasif Durumunu Kaydet"}
        </Button>
      </div>
    </div>
  );
}
