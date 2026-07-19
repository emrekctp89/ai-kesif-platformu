import logger from '@/utils/logger';
('use server');

import { createClient } from '@/utils/supabase/actions';
import { revalidatePath } from 'next/cache';
import { CATEGORY_SEED } from '@/lib/categoryConfig';

/**
 * Admin: eksik kanonik kategorileri veritabanına ekler.
 */
export async function seedExpandedCategories() {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const { data: existing, error: existingError } = await supabase.from('categories').select('slug');

  if (existingError) {
    logger.error('Kategori okuma hatası:', existingError);
    return { error: 'Mevcut kategoriler okunamadı.' };
  }

  const existingSlugs = new Set((existing || []).map((c) => c.slug));
  const toInsert = CATEGORY_SEED.filter((c) => !existingSlugs.has(c.slug));

  if (toInsert.length === 0) {
    return { success: 'Tüm kanonik kategoriler zaten mevcut.', inserted: 0 };
  }

  const { error } = await supabase.from('categories').insert(toInsert);

  if (error) {
    logger.error('Kategori seed hatası:', error);
    return { error: 'Kategoriler eklenirken hata oluştu: ' + error.message };
  }

  revalidatePath('/');
  revalidatePath('/kategori');
  revalidatePath('/admin');
  revalidatePath('/kesfet');

  return {
    success: `${toInsert.length} yeni kategori eklendi.`,
    inserted: toInsert.length,
  };
}
