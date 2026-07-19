'use server';

import logger from '@/utils/logger';

import { createClient } from '@/utils/supabase/actions';
import { revalidatePath } from 'next/cache';

export async function deleteReportedComment(alertId, commentId) {
  'use server';

  if (!alertId || !commentId) {
    return { error: 'Geçersiz parametreler.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Oturum açmanız gerekiyor.' };
  }

  // Sadece admin yetkisi kontrolü
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Bu işlem için yetkiniz yok.' };
  }

  try {
    // 1. Yorumu sil (soft delete veya hard delete). Hard delete yapıyoruz:
    const { error: deleteError } = await supabase.from('comments').delete().eq('id', commentId);

    if (deleteError) {
      logger.error('Yorum silinirken hata:', deleteError);
      return { error: 'Yorum silinemedi: ' + deleteError.message };
    }

    // 2. Alert (şikayet) kaydını çözüldü olarak işaretle
    const { error: alertError } = await supabase
      .from('system_alerts')
      .update({ status: 'Çözüldü', resolved_at: new Date().toISOString(), resolved_by: user.id })
      .eq('id', alertId);

    if (alertError) {
      logger.error('Uyarı güncellenirken hata:', alertError);
      return { error: 'Yorum silindi ancak uyarı güncellenemedi.' };
    }

    revalidatePath('/admin');
    return { success: 'Yorum başarıyla silindi ve şikayet kapatıldı.' };
  } catch (err) {
    logger.error('Moderasyon hatası:', err);
    return { error: 'Beklenmeyen bir hata oluştu.' };
  }
}

export async function dismissAlert(alertId) {
  'use server';

  if (!alertId) {
    return { error: 'Geçersiz parametreler.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Oturum açmanız gerekiyor.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Bu işlem için yetkiniz yok.' };
  }

  try {
    const { error } = await supabase
      .from('system_alerts')
      .update({ status: 'Kapatıldı', resolved_at: new Date().toISOString(), resolved_by: user.id })
      .eq('id', alertId);

    if (error) {
      return { error: 'Uyarı kapatılamadı: ' + error.message };
    }

    revalidatePath('/admin');
    return { success: 'Uyarı başarıyla kapatıldı (Geçersiz sayıldı).' };
  } catch (err) {
    logger.error('Dismiss hatası:', err);
    return { error: 'Beklenmeyen bir hata oluştu.' };
  }
}
