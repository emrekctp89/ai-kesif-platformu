'use server';

import logger from '@/utils/logger';

import { createClient } from '@/utils/supabase/actions';
import { revalidatePath } from 'next/cache';
import { uploadToGCS, deleteFromGCS } from '@/utils/gcs';

export async function updateUserProfile(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Bu işlem için giriş yapmalısınız.' };
  }

  const username = formData.get('username');
  const bio = formData.get('bio');

  if (username && !/^[a-z0-9_-]{3,15}$/.test(username)) {
    return {
      error:
        'Kullanıcı adı 3-15 karakter arasında olmalı ve sadece küçük harf, sayı, - veya _ içerebilir.',
    };
  }

  const profileData = {
    username: username,
    bio: bio,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').update(profileData).eq('id', user.id);

  if (error) {
    if (error.code === '23505') {
      return {
        error: 'Bu kullanıcı adı zaten alınmış. Lütfen başka bir tane deneyin.',
      };
    }
    logger.error('Profil güncelleme hatası:', error);
    return { error: 'Profiliniz güncellenirken bir hata oluştu.' };
  }

  revalidatePath('/profile');
  if (username) {
    revalidatePath(`/u/${username}`);
  }

  return { success: 'Profiliniz başarıyla güncellendi.' };
}

export async function updateAvatar(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Bu işlem için giriş yapmalısınız.' };
  }

  const file = formData.get('avatar');
  if (!file || file.size === 0) {
    return { error: 'Lütfen bir dosya seçin.' };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  const gcsPath = `avatars/${filePath}`;
  let publicUrl;
  try {
    publicUrl = await uploadToGCS(gcsPath, file, file.type || 'image/jpeg');
  } catch (uploadError) {
    logger.error('Avatar yükleme hatası (GCS):', uploadError);
    return { error: 'Avatar yüklenirken bir hata oluştu.' };
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);

  if (profileError) {
    logger.error('Profil güncelleme hatası:', profileError);
    await deleteFromGCS(gcsPath);
    return { error: 'Profil fotoğrafı güncellenirken bir hata oluştu.' };
  }

  revalidatePath('/profile');

  return { success: 'Profil fotoğrafınız başarıyla güncellendi.' };
}

export async function updateUserPapers(formData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Bu işlem için giriş yapmalısınız.' };

  const paperIds = formData.getAll('paperId').map((id) => parseInt(id, 10));

  await supabase.from('author_papers').delete().eq('author_id', user.id);

  if (paperIds.length > 0) {
    const newLinks = paperIds.map((paperId) => ({
      author_id: user.id,
      paper_id: paperId,
    }));
    const { error } = await supabase.from('author_papers').insert(newLinks);
    if (error) return { error: 'Akademik yayınlar güncellenirken bir hata oluştu.' };
  }

  revalidatePath('/profile');
  return { success: 'Akademik yayınlarınız başarıyla güncellendi.' };
}
