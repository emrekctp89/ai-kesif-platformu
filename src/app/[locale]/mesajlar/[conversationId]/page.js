import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';

// Belirli bir sohbete ait ilk mesajları çeken fonksiyon
async function getMessages(conversationId) {
  const supabase = await createClient();
  // DEĞİŞİKLİK: 'profiles' tablosundan doğru şekilde veri çekiyoruz
  const { data, error } = await supabase
    .from('messages')
    .select(
      `
            *, 
            profiles (username, avatar_url, email)
        `
    )
    .eq('conversation_id', conversationId)
    .order('created_at');

  if (error) {
    logger.error('Mesajlar çekilirken hata:', error);
    return [];
  }
  return data;
}

// Sohbetteki diğer kullanıcının bilgilerini çeken fonksiyon
async function getOtherParticipant(conversationId, currentUserId) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('conversation_participants')
    .select(`profiles(id, username, email, avatar_url)`)
    .eq('conversation_id', conversationId)
    .neq('user_id', currentUserId)
    .single();

  if (error) {
    logger.error('Diğer katılımcı çekilirken hata:', error);
    return null;
  }
  return data.profiles;
}

export default async function ConversationPage(props) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const conversationId = params.conversationId;

  // Kullanıcının kendi profil bilgilerini de alıyoruz
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Gerekli tüm verileri paralel olarak çekiyoruz
  const [initialMessages, otherParticipant] = await Promise.all([
    getMessages(conversationId),
    getOtherParticipant(conversationId, user.id),
  ]);

  return (
    <ChatWindow
      conversationId={conversationId}
      initialMessages={initialMessages}
      otherParticipant={otherParticipant}
      currentUser={{ ...user, ...currentUserProfile }} // Kullanıcı ve profil bilgilerini birleştiriyoruz
    />
  );
}
