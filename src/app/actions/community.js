'use server';

import { createClient } from '@/utils/supabase/actions';
import { revalidatePath } from 'next/cache';
import { enforceRateLimit } from '@/utils/antiAbuse';

const MAX_COMMENT_LENGTH = 1000;

export async function addComment(formData) {
  'use server';
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Yorum yapmak için giriş yapmalısınız.' };

  const content = String(formData.get('content') || '').trim();
  const toolId = formData.get('toolId');

  if (!content) return { error: 'Yorum boş olamaz.' };
  if (content.length > MAX_COMMENT_LENGTH) {
    return {
      error: `Yorum en fazla ${MAX_COMMENT_LENGTH} karakter olabilir.`,
    };
  }

  const rateLimit = await enforceRateLimit('add-comment', {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return {
      error: `Çok fazla yorum gönderdiniz. Yaklaşık ${Math.ceil(
        rateLimit.retryAfterSeconds / 60
      )} dakika sonra tekrar deneyin.`,
    };
  }

  const { error } = await supabase
    .from('comments')
    .insert({ content, tool_id: toolId, user_id: user.id });

  if (error) return { error: 'Yorumunuz eklenirken bir hata oluştu.' };

  revalidatePath(`/tool/${formData.get('toolSlug')}`);
  return { success: 'Yorumunuz başarıyla eklendi.' };
}

export async function deleteComment(formData) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Bu işlem için giriş yapmalısınız.' };
  }

  const commentId = formData.get('commentId');

  if (!commentId) {
    return { error: "Yorum ID'si bulunamadı." };
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Yorum silme hatası:', error);
    return { error: 'Yorum silinirken bir hata oluştu.' };
  }

  revalidatePath('/profile');

  return { success: 'Yorum başarıyla silindi.' };
}

export async function submitPrompt(formData) {
  'use server';
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Prompt göndermek için giriş yapmalısınız.' };

  const title = String(formData.get('title') || '').trim();
  const prompt_text = String(formData.get('prompt_text') || '').trim();
  const notes = String(formData.get('notes') || '').trim();
  const tool_id = formData.get('toolId');

  if (!title || !prompt_text || !tool_id)
    return { error: 'Başlık, prompt ve araç seçimi zorunludur.' };

  if (title.length > 150 || prompt_text.length > 4000 || notes.length > 1000) {
    return { error: 'Girilen metinler izin verilen uzunluğu aşıyor.' };
  }

  const rateLimit = await enforceRateLimit('submit-prompt', {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return {
      error: `Çok fazla prompt gönderdiniz. Yaklaşık ${Math.ceil(
        rateLimit.retryAfterSeconds / 60
      )} dakika sonra tekrar deneyin.`,
    };
  }

  const { data: newPrompt, error: insertError } = await supabase
    .from('prompts')
    .insert({
      title,
      prompt_text,
      notes,
      tool_id,
      user_id: user.id,
      vote_count: 1,
    })
    .select('id')
    .single();

  if (insertError) return { error: 'Prompt gönderilirken bir hata oluştu.' };

  await supabase.from('prompt_votes').insert({ prompt_id: newPrompt.id, user_id: user.id });

  revalidatePath(`/tool/${formData.get('toolSlug')}`);
  return { success: 'Prompt başarıyla gönderildi!' };
}

export async function togglePromptVote(formData) {
  'use server';
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Oylama yapmak için giriş yapmalısınız.' };

  const promptId = formData.get('promptId');
  const { data: existingVote } = await supabase
    .from('prompt_votes')
    .select('prompt_id')
    .eq('user_id', user.id)
    .eq('prompt_id', promptId)
    .maybeSingle();

  if (existingVote) {
    await supabase.from('prompt_votes').delete().match({ user_id: user.id, prompt_id: promptId });
  } else {
    await supabase.from('prompt_votes').insert({ user_id: user.id, prompt_id: promptId });
  }

  revalidatePath(`/tool/${formData.get('toolSlug')}`);
  return { success: true };
}

export async function deletePrompt(formData) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Bu işlem için giriş yapmalısınız.' };
  }

  const promptId = formData.get('promptId');

  if (!promptId) {
    return { error: "Prompt ID'si bulunamadı." };
  }

  const { error } = await supabase
    .from('prompts')
    .delete()
    .eq('id', promptId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Prompt silme hatası:', error);
    return { error: 'Prompt silinirken bir hata oluştu.' };
  }

  revalidatePath('/profile');
  if (formData.get('toolSlug')) {
    revalidatePath(`/tool/${formData.get('toolSlug')}`);
  }

  return { success: 'Prompt başarıyla silindi.' };
}

export async function toggleFollowUser(formData) {
  'use server';

  const supabase = createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return { error: 'Bu işlem için giriş yapmalısınız.' };
  }

  const targetUserId = formData.get('targetUserId');
  const targetUsername = formData.get('targetUsername');

  if (!targetUserId) {
    return { error: "Hedef kullanıcı ID'si bulunamadı." };
  }

  if (currentUser.id === targetUserId) {
    return { error: 'Kendinizi takip edemezsiniz.' };
  }

  const { data: existingFollow, error: checkError } = await supabase
    .from('followers')
    .select('*')
    .eq('follower_id', currentUser.id)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (checkError) {
    console.error('Takip kontrolü hatası:', checkError);
    return { error: 'İşlem sırasında bir veritabanı hatası oluştu.' };
  }

  if (existingFollow) {
    const { error: unfollowError } = await supabase
      .from('followers')
      .delete()
      .match({ follower_id: currentUser.id, following_id: targetUserId });

    if (unfollowError) {
      console.error('Takipten çıkma hatası:', unfollowError);
      return { error: 'Takipten çıkılırken bir hata oluştu.' };
    }
  } else {
    const { error: followError } = await supabase
      .from('followers')
      .insert({ follower_id: currentUser.id, following_id: targetUserId });

    if (followError) {
      console.error('Takip etme hatası:', followError);
      return { error: 'Takip edilirken bir hata oluştu.' };
    }

    // Bildirim oluştur
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', currentUser.id)
      .single();

    if (currentUserProfile) {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        event_type: 'yeni_takipci',
        message: `@${currentUserProfile.username} seni takip etmeye başladı.`,
        link: `/u/${currentUserProfile.username}`,
      });
    }
  }

  if (targetUsername) {
    revalidatePath(`/u/${targetUsername}`);
  }

  return { success: true };
}

export async function reportComment(formData) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Bu işlem için giriş yapmalısınız.' };
  }

  const commentId = formData.get('commentId');
  const reason = String(formData.get('reason') || '').trim();

  if (!commentId || !reason) {
    return { error: "Yorum ID'si ve şikayet sebebi zorunludur." };
  }

  const rateLimit = await enforceRateLimit('report-comment', {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return {
      error: `Çok fazla şikayet gönderdiniz. Lütfen daha sonra tekrar deneyin.`,
    };
  }

  const { error } = await supabase.from('admin_alerts').insert({
    alert_type: 'reported_comment',
    description: `Kullanıcı (ID: ${user.id}) bir yorumu şikayet etti.\n\nSebep: ${reason}`,
    status: 'Açık',
    metadata: {
      comment_id: commentId,
      reporter_id: user.id,
      reason: reason,
    },
  });

  if (error) {
    console.error('Yorum şikayet hatası:', error);
    return { error: 'Şikayet gönderilirken bir hata oluştu.' };
  }

  return { success: 'Şikayetiniz başarıyla iletildi ve yöneticiler tarafından incelenecek.' };
}
