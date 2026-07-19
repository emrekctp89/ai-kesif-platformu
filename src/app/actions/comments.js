import logger from '@/utils/logger';
('use server');

import { createClient } from '@/utils/supabase/actions';
import { revalidatePath } from 'next/cache';

export async function getComments(toolId) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tool_comments_with_users')
    .select('*')
    .eq('tool_id', toolId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching comments:', error);
    return [];
  }
  return data;
}

export async function addComment(toolId, toolSlug, content) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Yorum yapmak için giriş yapmalısınız.' };
  }

  if (!content || content.trim().length === 0) {
    return { error: 'Yorum boş olamaz.' };
  }

  const { data, error } = await supabase
    .from('tool_comments')
    .insert([
      {
        tool_id: toolId,
        user_id: user.id,
        content: content.trim(),
      },
    ])
    .select()
    .single();

  if (error) {
    logger.error('Error adding comment:', error);
    return { error: 'Yorum eklenirken bir hata oluştu.' };
  }

  revalidatePath(`/tool/${toolSlug}`);
  return { success: true, comment: data };
}

export async function deleteComment(commentId, toolSlug) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Oturum açmalısınız.' };
  }

  const { error } = await supabase
    .from('tool_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) {
    logger.error('Error deleting comment:', error);
    return { error: 'Yorum silinirken bir hata oluştu.' };
  }

  revalidatePath(`/tool/${toolSlug}`);
  return { success: true };
}
