import logger from '@/utils/logger';
('use server');

import { createClient } from '@/utils/supabase/actions';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function startConversation(recipientUserId) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(
      `/login?message=${encodeURIComponent('Mesaj göndermek için giriş yapmalısınız.')}`
    );
  }

  if (user.id === recipientUserId) {
    return redirect('/');
  }

  const { data: conversationId, error } = await supabase.rpc('create_or_find_conversation', {
    p_user1_id: user.id,
    p_user2_id: recipientUserId,
  });

  if (error) {
    logger.error('Sohbet başlatma hatası:', error);
    return redirect(`/profile?message=${encodeURIComponent('Sohbet başlatılamadı.')}`);
  }

  redirect(`/mesajlar/${conversationId}`);
}

export async function sendMessage(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Mesaj göndermek için giriş yapmalısınız.' };
  }

  const content = formData.get('content');
  const conversationId = formData.get('conversationId');

  if (!content || !conversationId || content.trim() === '') {
    return { error: 'Mesaj içeriği boş olamaz.' };
  }

  const { error: messageError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: content.trim(),
  });

  if (messageError) {
    logger.error('Mesaj gönderme hatası:', messageError);
    return { error: 'Mesajınız gönderilirken bir hata oluştu.' };
  }

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  revalidatePath(`/mesajlar/${conversationId}`);
  revalidatePath('/mesajlar');

  return { success: 'Mesaj gönderildi.' };
}

export async function searchUsers(searchTerm) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url')
    .or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .neq('id', user.id)
    .limit(5);

  if (error) {
    logger.error('Kullanıcı arama hatası:', error);
    return [];
  }
  return data;
}

export async function getRecentConversationsForShare() {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: userConvos, error: userConvosError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id);

  if (userConvosError || !userConvos || userConvos.length === 0) {
    return [];
  }

  const conversationIds = userConvos.map((c) => c.conversation_id);

  const { data: otherParticipants, error: participantsError } = await supabase
    .from('conversation_participants')
    .select(
      `
      profiles (id, username, avatar_url, email),
      conversations (last_message_at)
    `
    )
    .in('conversation_id', conversationIds)
    .neq('user_id', user.id)
    .order('last_message_at', {
      referencedTable: 'conversations',
      ascending: false,
    })
    .limit(5);

  if (participantsError) {
    logger.error('Son sohbetler çekilirken hata (katılımcılar):', participantsError);
    return [];
  }

  return otherParticipants.map((p) => p.profiles);
}

export async function sendMessageWithSharedContent(formData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user: sender },
  } = await supabase.auth.getUser();

  if (!sender) {
    return { error: 'Mesaj göndermek için giriş yapmalısınız.' };
  }

  const recipientIds = formData.getAll('recipients');
  const note = formData.get('note');
  const sharedContent = JSON.parse(formData.get('sharedContent'));

  if (!recipientIds || recipientIds.length === 0) {
    return { error: 'Lütfen en az bir alıcı seçin.' };
  }

  try {
    for (const recipientId of recipientIds) {
      const { data: conversationId, error: convoError } = await supabase.rpc(
        'create_or_find_conversation',
        {
          p_user1_id: sender.id,
          p_user2_id: recipientId,
        }
      );

      if (convoError || !conversationId) {
        logger.error('Sohbet oluşturma/bulma hatası:', convoError);
        return { error: 'Sohbet odası oluşturulamadı.' };
      }

      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: sender.id,
        content: note || null,
        shared_content: sharedContent,
      });

      if (messageError) {
        logger.error('Mesaj ekleme hatası:', messageError);
        return { error: 'Mesaj gönderilirken bir veritabanı hatası oluştu.' };
      }

      const { error: updateError } = await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (updateError) {
        logger.error('Sohbet zamanı güncelleme hatası:', updateError);
      }
    }
  } catch (error) {
    logger.error('Paylaşım mesajı gönderme hatası (catch):', error);
    return { error: 'Mesajlar gönderilirken beklenmedik bir hata oluştu.' };
  }

  revalidatePath('/mesajlar');
  return { success: 'İçerik başarıyla paylaşıldı!' };
}

export async function markConversationAsRead(conversationId) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !conversationId) {
    return { error: "Kullanıcı veya sohbet ID'si eksik." };
  }

  const { error } = await supabase.rpc('mark_conversation_as_read', {
    p_conversation_id: conversationId,
    p_user_id: user.id,
  });

  if (error) {
    logger.error('Mesajları okundu olarak işaretleme hatası:', error);
    return { error: 'Mesajlar okunmuş olarak işaretlenemedi.' };
  }

  revalidatePath('/mesajlar', 'layout');

  return { success: true };
}
