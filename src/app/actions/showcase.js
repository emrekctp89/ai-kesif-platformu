'use server';

import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { uploadToGCS, deleteFromGCS, gcsPathFromUrl } from '@/utils/gcs';

export async function submitShowcaseItem(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Eser göndermek için giriş yapmalısınız.' };
  }

  const title = formData.get('title');
  const description = formData.get('description');
  const contentType = formData.get('content_type');
  const imageFile = formData.get('image');
  const contentText = formData.get('content_text');
  const creativeProcess = formData.get('creative_process');

  if (!title || !contentType) {
    return { error: 'Başlık ve içerik türü zorunludur.' };
  }

  let imageUrl = null;

  if (contentType === 'Görsel') {
    if (!imageFile || imageFile.size === 0) {
      return { error: 'Görsel içerik türü için bir dosya seçmelisiniz.' };
    }

    const fileExt = imageFile.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;
    const gcsPath = `showcase-images/${filePath}`;

    try {
      imageUrl = await uploadToGCS(gcsPath, imageFile, imageFile.type || 'image/jpeg');
    } catch (uploadError) {
      console.error('Eser görseli yükleme hatası (GCS):', uploadError);
      return { error: 'Görsel yüklenirken bir hata oluştu.' };
    }
  }

  const showcaseData = {
    title,
    description,
    content_type: contentType,
    content_text: contentType !== 'Görsel' ? contentText : null,
    image_url: imageUrl,
    user_id: user.id,
    is_approved: false,
    creative_process: creativeProcess ? JSON.parse(creativeProcess) : null,
  };

  const { error: insertError } = await supabase.from('showcase_items').insert([showcaseData]);

  if (insertError) {
    console.error('Eser kaydetme hatası:', insertError);
    if (imageUrl) {
      await deleteFromGCS(gcsPathFromUrl(imageUrl) || imageUrl);
    }
    return { error: 'Eseriniz kaydedilirken bir hata oluştu.' };
  }

  revalidatePath('/profile');
  revalidatePath('/eserler');

  return {
    success: 'Eseriniz başarıyla gönderildi! Onaylandıktan sonra yayınlanacaktır.',
  };
}

export async function deleteShowcaseItem(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Bu işlem için giriş yapmalısınız.' };
  }

  const itemId = formData.get('itemId');
  const imageUrl = formData.get('imageUrl');

  if (!itemId) {
    return { error: "Eser ID'si bulunamadı." };
  }

  const { error: dbError } = await supabase
    .from('showcase_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', user.id);

  if (dbError) {
    console.error('Eser silme veritabanı hatası:', dbError);
    return { error: 'Eser silinirken bir veritabanı hatası oluştu.' };
  }

  if (imageUrl) {
    try {
      await deleteFromGCS(gcsPathFromUrl(imageUrl) || imageUrl);
    } catch (storageError) {
      console.error('Eser görseli silme hatası (GCS):', storageError);
    }
  }

  revalidatePath('/profile');
  revalidatePath('/eserler');

  return { success: 'Eser başarıyla silindi.' };
}

export async function approveShowcaseItem(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return;
  }

  const itemId = formData.get('itemId');
  if (!itemId) {
    return { error: "Eser ID'si bulunamadı." };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('showcase_items')
    .update({ is_approved: true })
    .eq('id', itemId);

  if (error) {
    console.error('Eser onaylama hatası:', error);
    return { error: 'Eser onaylanırken bir veritabanı hatası oluştu.' };
  }

  revalidatePath('/admin');
  revalidatePath('/eserler');

  return { success: true };
}

export async function updateShowcaseItem(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Bu işlem için giriş yapmalısınız.' };
  }

  const itemId = formData.get('itemId');
  const title = formData.get('title');
  const description = formData.get('description');
  const contentText = formData.get('content_text');

  if (!itemId || !title) {
    return { error: 'ID ve başlık zorunludur.' };
  }

  const updateData = {
    title,
    description,
    content_text: contentText,
  };

  const { error } = await supabase
    .from('showcase_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Eser güncelleme hatası:', error);
    return { error: 'Eser güncellenirken bir hata oluştu.' };
  }

  revalidatePath('/profile');
  revalidatePath('/eserler');

  return { success: 'Eser başarıyla güncellendi.' };
}

export async function assignTagsToShowcaseItem(formData) {
  'use server';
  return { success: 'Etiket atama fonksiyonu henüz aktif değil.' };
}

export async function addShowcaseComment(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Yorum yapmak için giriş yapmalısınız.' };
  }

  const content = formData.get('content');
  const itemId = formData.get('itemId');

  if (!content || content.trim() === '') {
    return { error: 'Yorum boş olamaz.' };
  }
  if (!itemId) {
    return { error: 'Eser bilgisi eksik.' };
  }

  const { error } = await supabase.from('showcase_comments').insert({
    content: content,
    item_id: itemId,
    user_id: user.id,
  });

  if (error) {
    console.error('Eser yorumu ekleme hatası:', error);
    return { error: 'Yorumunuz eklenirken bir hata oluştu.' };
  }

  revalidatePath('/eserler');
  return { success: 'Yorumunuz başarıyla eklendi.' };
}

export async function deleteShowcaseComment(formData) {
  'use server';

  const supabase = await createClient();
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
    .from('showcase_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Eser yorumu silme hatası:', error);
    return { error: 'Yorum silinirken bir hata oluştu.' };
  }

  revalidatePath('/eserler');
  return { success: 'Yorum başarıyla silindi.' };
}

export async function toggleShowcaseVote(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Oylama yapmak için giriş yapmalısınız.' };
  }

  const itemId = formData.get('itemId');
  if (!itemId) {
    return { error: "Eser ID'si bulunamadı." };
  }

  const { data: existingVote } = await supabase
    .from('showcase_votes')
    .select('item_id')
    .eq('user_id', user.id)
    .eq('item_id', itemId)
    .maybeSingle();

  const supabaseAdmin = createAdminClient();
  let finalError;

  if (existingVote) {
    const { error: deleteError } = await supabase
      .from('showcase_votes')
      .delete()
      .match({ user_id: user.id, item_id: itemId });
    if (!deleteError) {
      const { error: countError } = await supabaseAdmin.rpc('decrement_showcase_vote', {
        p_item_id: itemId,
      });
      finalError = countError;
    } else {
      finalError = deleteError;
    }
  } else {
    const { error: insertError } = await supabase
      .from('showcase_votes')
      .insert({ user_id: user.id, item_id: itemId });
    if (!insertError) {
      const { error: countError } = await supabaseAdmin.rpc('increment_showcase_vote', {
        p_item_id: itemId,
      });
      finalError = countError;
    } else {
      finalError = insertError;
    }
  }

  if (finalError) {
    console.error('Eser oylama hatası:', finalError);
    return { error: `Hata: ${finalError.message}` };
  }

  revalidatePath('/eserler');
  return { success: true };
}

export async function getShowcaseItemDetails(itemId) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: comments } = await supabase
    .from('showcase_comments')
    .select(`*, profiles(email, avatar_url)`)
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });

  let isVoted = false;
  if (user) {
    const { data: vote } = await supabase
      .from('showcase_votes')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .single();
    if (vote) {
      isVoted = true;
    }
  }

  return { comments: comments || [], isVoted };
}
