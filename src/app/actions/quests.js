'use server';

import logger from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';

function isAdminUser(user) {
  return Boolean(user?.email && user.email === process.env.ADMIN_EMAIL);
}

function isCronSecretValid(secret) {
  const expected = process.env.CRON_SECRET;
  return Boolean(expected && secret && secret === expected);
}

function pickRandomQuests(allQuests, count = 3) {
  const shuffled = [...allQuests].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Wipe and re-assign today's daily quests for all users (or one user).
 * Admin session or cron secret required.
 *
 * @param {{ cronSecret?: string, userId?: string, questsPerUser?: number }} [options]
 */
export async function reassignTodayDailyQuests(options = {}) {
  const { cronSecret, userId = null, questsPerUser = 3 } = options;

  if (!isCronSecretValid(cronSecret)) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdminUser(user)) {
      return { error: 'Yetkiniz yok.' };
    }
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: allQuests, error: questsError } = await admin
    .from('quests')
    .select('id, name, description, action_type, is_active')
    .eq('is_active', true);

  if (questsError) {
    logger.error('reassignTodayDailyQuests quests load', questsError);
    return { error: 'Aktif görevler okunamadı.' };
  }
  if (!allQuests?.length) {
    return { error: 'Aktif görev bulunamadı.' };
  }

  let usersQuery = admin.from('profiles').select('id');
  if (userId) usersQuery = usersQuery.eq('id', userId);
  const { data: users, error: usersError } = await usersQuery;
  if (usersError) {
    logger.error('reassignTodayDailyQuests users load', usersError);
    return { error: 'Kullanıcılar okunamadı.' };
  }

  const userIds = (users || []).map((u) => u.id).filter(Boolean);
  if (!userIds.length) {
    return { success: true, message: 'Kullanıcı yok.', assignedUsers: 0, deletedRows: 0 };
  }

  // Delete today's assignments (scoped if single user).
  let deleteQuery = admin.from('user_daily_quests').delete().eq('quest_date', today);
  if (userId) deleteQuery = deleteQuery.eq('user_id', userId);
  const { error: deleteError, count: deletedCount } = await deleteQuery.select('id', {
    count: 'exact',
    head: false,
  });
  // Some clients return deleted rows in data; count may be null.
  if (deleteError) {
    logger.error('reassignTodayDailyQuests delete', deleteError);
    return { error: 'Bugünkü görevler silinemedi.' };
  }

  const rows = [];
  for (const uid of userIds) {
    const selected = pickRandomQuests(allQuests, questsPerUser);
    for (const quest of selected) {
      rows.push({
        user_id: uid,
        quest_id: quest.id,
        quest_date: today,
        current_progress: 0,
        is_completed: false,
      });
    }
  }

  // Batch insert in chunks to avoid payload limits.
  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error: insertError } = await admin.from('user_daily_quests').insert(chunk);
    if (insertError) {
      logger.error('reassignTodayDailyQuests insert', insertError);
      return {
        error: 'Yeni görevler yazılırken hata oluştu.',
        partialInserted: inserted,
      };
    }
    inserted += chunk.length;
  }

  revalidatePath('/profile');
  revalidatePath('/icerik');
  revalidatePath('/dashboard');

  return {
    success: true,
    message: `${userIds.length} kullanıcı için bugünkü görevler yenilendi.`,
    assignedUsers: userIds.length,
    insertedRows: inserted,
    deletedHint: deletedCount ?? null,
    questCatalogSize: allQuests.length,
    date: today,
  };
}
