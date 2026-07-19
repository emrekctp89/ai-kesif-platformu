import logger from '@/utils/logger';

/**
 * Best-effort daily quest progress bump.
 * Never throws — failures are logged only.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {string} actionType - matches quests.action_type (rating, comment, favorite, follow_user, visit_tool)
 */
export async function bumpQuestProgress(supabase, userId, actionType) {
  if (!supabase || !userId || !actionType) return { ok: false };
  try {
    const { error } = await supabase.rpc('update_quest_progress', {
      p_user_id: userId,
      p_action_type: actionType,
    });
    if (error) {
      logger.error('update_quest_progress failed', actionType, error);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (error) {
    logger.error('bumpQuestProgress exception', actionType, error);
    return { ok: false, error };
  }
}
