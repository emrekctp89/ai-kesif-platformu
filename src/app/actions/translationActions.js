'use server';

import { createClient } from '@/utils/supabase/actions';
import { translateText } from '@/utils/translate';

function readField(input, key) {
  if (!input) return undefined;
  if (typeof input.get === 'function') return input.get(key);
  return input[key];
}

/**
 * Admin-only Cloud Translation helper.
 * Accepts FormData or a plain object: { text, targetLanguage }.
 */
export async function autoTranslateAction(input) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const textToTranslate = String(readField(input, 'text') || '').trim();
  const targetLanguage = String(readField(input, 'targetLanguage') || 'tr').trim() || 'tr';

  if (!textToTranslate) {
    return { error: 'Çevrilecek metin bulunamadı.' };
  }

  if (textToTranslate.length > 8000) {
    return { error: 'Metin çok uzun (maks. 8000 karakter).' };
  }

  try {
    const translatedText = await translateText(textToTranslate, targetLanguage);
    return {
      success: true,
      translatedText: Array.isArray(translatedText) ? translatedText.join('\n') : translatedText,
      targetLanguage,
    };
  } catch (err) {
    console.error('Action çeviri hatası:', err);
    return { error: 'Çeviri başarısız oldu. GCP Translation API ve yetkileri kontrol edin.' };
  }
}
