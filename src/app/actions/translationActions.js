'use server';

import { createClient } from '@/utils/supabase/actions';
import { translateText } from '@/utils/translate';

/**
 * Server Action: Kullanıcının girdiği metni belirtilen dile çevirir.
 * Genellikle Admin panellerinde buton tetiklemesiyle kullanılır.
 */
export async function autoTranslateAction(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sadece yetkili kullanıcılar/admin çeviri API'sini tetikleyebilir (maliyetleri korumak için)
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const textToTranslate = formData.get('text');
  const targetLanguage = formData.get('targetLanguage') || 'tr'; // Varsayılan: Türkçe

  if (!textToTranslate || textToTranslate.trim() === '') {
    return { error: 'Çevrilecek metin bulunamadı.' };
  }

  try {
    const translatedText = await translateText(textToTranslate, targetLanguage);
    return { success: true, translatedText };
  } catch (err) {
    console.error('Action çeviri hatası:', err);
    return { error: 'Çeviri başarısız oldu.' };
  }
}
