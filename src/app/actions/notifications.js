'use server';

import logger from '@/utils/logger';

import { createClient } from '@/utils/supabase/actions';
import { revalidatePath } from 'next/cache';

export async function getNotifications() {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { notifications: [], unreadCount: 0 };

  const { data, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('is_read', false);

  const { data: notificationsData, error: notificationsError } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || notificationsError) {
    logger.error('Bildirimleri çekerken hata:', error || notificationsError);
    return { notifications: [], unreadCount: 0 };
  }

  return { notifications: notificationsData, unreadCount: count || 0 };
}

export async function markNotificationsAsRead() {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  revalidatePath('/', 'layout');
}

export async function savePushSubscription(subscriptionJSON) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Kullanıcı bulunamadı.' };

  const { error: upsertError } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      subscription: subscriptionJSON,
    },
    { onConflict: 'user_id' }
  );

  if (upsertError) {
    logger.error('Push aboneliği kaydetme hatası:', upsertError);
    return { error: 'Abonelik kaydedilemedi.' };
  }

  await supabase.from('profiles').update({ wants_push_notifications: true }).eq('id', user.id);

  revalidatePath('/profile');
  return { success: true };
}

export async function deletePushSubscription() {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Kullanıcı bulunamadı.' };

  await supabase.from('push_subscriptions').delete().eq('user_id', user.id);

  await supabase.from('profiles').update({ wants_push_notifications: false }).eq('id', user.id);

  revalidatePath('/profile');
  return { success: true };
}

/**
 * @param {{ mode?: 'following' | 'general' }} [options]
 * - following: takip edilenlerin aktiviteleri (giriş gerekir)
 * - general: genel topluluk akışı
 */
export async function fetchActivityFeed(options = {}) {
  'use server';

  const mode = options?.mode === 'general' ? 'general' : 'following';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rpcArgs = mode === 'following' && user?.id ? { p_user_id: user.id } : {};

  const { data, error } = await supabase.rpc('get_community_activity_feed', rpcArgs);

  if (error) {
    logger.error('Aktivite akışı yeniden çekilirken hata:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}
