'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { generateToolVariants, updateToolVariants, applyWinningVariant } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle } from 'lucide-react';
import { getEditableToolVariants, getOriginalToolVariant } from '@/utils/toolVariants';
import { useTranslations } from 'next-intl';

export function ToolVariantManager({ tool, locale }) {
  const t = useTranslations('ToolEditor');
  // Admin tool lists often omit tool_variants relation — default to [].
  const [variants, setVariants] = React.useState(() => getEditableToolVariants(tool));
  const [isGenerating, startGeneratingTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();

  React.useEffect(() => {
    setVariants(getEditableToolVariants(tool));
  }, [tool]);

  const originalVariant = getOriginalToolVariant(tool);

  // AI ile yeni varyantlar üreten fonksiyon
  const handleGenerateVariants = () => {
    startGeneratingTransition(async () => {
      const result = await generateToolVariants(tool.id);
      if (result.error) {
        toast.error(locale === 'en' ? t('variantOperationFailed') : result.error);
      } else {
        // Mevcut varyantların üzerine yazmak yerine, yenilerini ekliyoruz.
        setVariants((prev) => [...prev, ...result.data.map((v) => ({ ...v, is_active: false }))]);
        toast.success(t('variantsGenerated'));
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
      formData.append('toolId', tool.id);
      formData.append('variants', JSON.stringify(variants));
      const result = await updateToolVariants(formData);
      if (result.error) {
        toast.error(locale === 'en' ? t('variantOperationFailed') : result.error);
      } else {
        toast.success(t('variantsSaved'));
      }
    });
  };

  const handleApplyWinner = (variant) => {
    if (
      !confirm(
        t('winnerConfirmation', { title: variant.title })
      )
    ) {
      return;
    }
    startSavingTransition(async () => {
      const formData = new FormData();
      formData.append('toolId', tool.id);
      formData.append('newTitle', variant.title);
      formData.append('newDescription', variant.description);
      const result = await applyWinningVariant(formData);
      if (result.error) {
        toast.error(locale === 'en' ? t('variantOperationFailed') : result.error);
      } else {
        toast.success(t('winnerApplied'));
        // Arayüzü güncellemek için sayfayı yenilemek en basit yol
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-4 pt-4 mt-4 border-t">
      <h4 className="font-semibold">{t('abTestVariants')}</h4>

      {/* İstatistik Tablosu */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('variant')}</TableHead>
              <TableHead>{t('impressions')}</TableHead>
              <TableHead>{t('clicks')}</TableHead>
              <TableHead>CTR (%)</TableHead>
              <TableHead>{t('active')}</TableHead>
              <TableHead className="text-right">{t('action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {originalVariant && (
              <TableRow>
                <TableCell className="font-medium">
                  {originalVariant.title} ({t('original')})
                </TableCell>
                <TableCell>{originalVariant.impressions || '-'}</TableCell>
                <TableCell>{originalVariant.clicks || '-'}</TableCell>
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
                      {t('makeWinner')}
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
        <Button variant="outline" onClick={handleGenerateVariants} disabled={isGenerating}>
          <Sparkles className="w-4 h-4 mr-2" />
          {isGenerating ? t('generating') : t('generateWithAi')}
        </Button>
        <Button onClick={handleSaveChanges} disabled={isSaving}>
          {isSaving ? t('saving') : t('saveActiveStatus')}
        </Button>
      </div>
    </div>
  );
}
