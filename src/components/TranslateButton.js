'use client';

import logger from '@/utils/logger';

import { useState } from 'react';
import { Languages, LoaderCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { autoTranslateAction } from '@/app/actions';

const LANGUAGE_OPTIONS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh-CN', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
];

/**
 * Admin helper: translate text via Cloud Translation and push result to parent.
 * @param {{ getText: () => string, onTranslated: (text: string) => void, label?: string, size?: string, variant?: string, targetLanguage?: string }} props
 */
export function TranslateButton({
  getText,
  onTranslated,
  label = 'Çevir',
  size = 'sm',
  variant = 'outline',
  className,
  targetLanguage,
}) {
  const [isTranslating, setIsTranslating] = useState(false);

  const runTranslate = async (langCode) => {
    const text = String(getText?.() || '').trim();
    if (!text) {
      toast.error('Önce çevrilecek metni yazın.');
      return;
    }

    setIsTranslating(true);
    try {
      const result = await autoTranslateAction({ text, targetLanguage: langCode });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      onTranslated?.(result.translatedText);
      const lang = LANGUAGE_OPTIONS.find((item) => item.code === langCode)?.label;
      toast.success(`Metin ${lang || langCode} diline çevrildi.`);
    } catch (error) {
      logger.error(error);
      toast.error('Çeviri sırasında bir hata oluştu.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Fixed target language → simple button (no menu)
  if (targetLanguage) {
    return (
      <Button
        type="button"
        size={size}
        variant={variant}
        disabled={isTranslating}
        className={className}
        onClick={() => runTranslate(targetLanguage)}
      >
        {isTranslating ? (
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Languages className="mr-2 h-4 w-4" />
        )}
        {isTranslating ? 'Çevriliyor…' : label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size={size}
          variant={variant}
          disabled={isTranslating}
          className={className}
        >
          {isTranslating ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Languages className="mr-2 h-4 w-4" />
          )}
          {isTranslating ? 'Çevriliyor…' : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Hedef dil</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGE_OPTIONS.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            disabled={isTranslating}
            onSelect={() => runTranslate(lang.code)}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
