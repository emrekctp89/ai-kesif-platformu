'use server';

import logger from '@/utils/logger';

import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function deleteUserFromAdmin(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Bu işlem için yetkiniz yok.' };
  }

  const userIdToDelete = formData.get('userId');
  if (!userIdToDelete) {
    return { error: "Kullanıcı ID'si bulunamadı." };
  }

  if (user.id === userIdToDelete) {
    return { error: 'Admin kendi hesabını bu panelden silemez.' };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

  if (error) {
    logger.error('Admin panelinden kullanıcı silme hatası:', error);
    return { error: 'Kullanıcı silinirken bir hata oluştu.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/admin');

  return { success: 'Kullanıcı başarıyla silindi.' };
}

export async function updateAdminAlertStatus(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const alertId = formData.get('alertId');
  const newStatus = formData.get('newStatus');

  if (!alertId || !newStatus) {
    return { error: 'Gerekli bilgiler eksik.' };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('admin_alerts')
    .update({
      status: newStatus,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) {
    logger.error('Uyarı durumu güncellenirken hata:', error);
    return { error: 'Uyarı durumu güncellenemedi.' };
  }

  revalidatePath('/admin');
  return { success: 'Uyarı durumu güncellendi.' };
}

/**
 * Pin soft-landing A/B winner without editing env vars (DB app_settings).
 * @param {FormData|{ variant?: string, note?: string }} formData
 */
export async function pinKasifSoftLandingWinner(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const raw =
    formData instanceof FormData
      ? formData.get('variant')
      : formData && typeof formData === 'object'
        ? formData.variant
        : null;
  const note =
    formData instanceof FormData
      ? formData.get('note')
      : formData && typeof formData === 'object'
        ? formData.note
        : null;

  const variantRaw = String(raw || '')
    .trim()
    .toUpperCase();
  const clear = variantRaw === 'CLEAR' || variantRaw === 'NONE' || variantRaw === '';
  const variant = clear ? null : variantRaw === 'A' || variantRaw === 'B' ? variantRaw : null;
  if (!clear && !variant) {
    return { error: 'Geçersiz varyant. A, B veya clear kullanın.' };
  }

  try {
    const { setSoftLandingOpsPin } = await import('@/lib/kasif/server');
    const pin = await setSoftLandingOpsPin(variant, {
      userId: user.id,
      note: note ? String(note).slice(0, 280) : null,
    });
    revalidatePath('/admin');
    return {
      success: pin.variant
        ? `Soft-landing kazananı pinlendi: ${pin.variant}`
        : 'Soft-landing ops pin kaldırıldı (A/B split).',
      pin,
    };
  } catch (error) {
    logger.error('Soft-landing pin failed:', error);
    return {
      error:
        error?.message?.includes('app_settings') || error?.code === '42P01'
          ? 'app_settings tablosu yok. Migration 20260726120000_create_app_settings.sql uygulayın.'
          : error?.message || 'Pin kaydedilemedi.',
    };
  }
}

/**
 * Last weekly ops digest snapshot + ring history (admin only).
 */
export async function getKasifOpsDigestHistory() {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  try {
    const { getOpsDigestHistory } = await import('@/lib/kasif/server');
    const doc = await getOpsDigestHistory();
    const last = doc.last
      ? {
          savedAt: doc.last.savedAt || null,
          subject: doc.last.subject || null,
          emailSent: Boolean(doc.last.emailSent),
          emailReason: doc.last.emailReason || null,
          dryRun: Boolean(doc.last.dryRun),
          windowDays: doc.last.windowDays ?? null,
          periodLabel: doc.last.periodLabel || null,
          quality: doc.last.quality || null,
          funnel: doc.last.funnel || null,
          packRoi: doc.last.packRoi || null,
          softLanding: doc.last.softLanding || null,
          addTool: doc.last.addTool || null,
        }
      : null;

    const history = (doc.history || []).map((entry) => ({
      savedAt: entry.savedAt || null,
      subject: entry.subject || null,
      emailSent: Boolean(entry.emailSent),
      periodLabel: entry.periodLabel || null,
      quality: entry.quality || null,
      funnel: entry.funnel || null,
      packRoi: entry.packRoi || null,
      softLanding: entry.softLanding || null,
    }));

    const { pickOpsDigestDeltaPair } = await import('@/lib/kasif');
    const { delta } = pickOpsDigestDeltaPair({ last, history });

    return {
      success: true,
      updatedAt: doc.updatedAt || null,
      last,
      history,
      weekDelta: delta,
    };
  } catch (error) {
    logger.error('Ops digest history load failed:', error);
    return { error: error?.message || 'Geçmiş yüklenemedi.' };
  }
}
