'use server';

import { createClient } from '@/utils/supabase/actions';
import { revalidatePath } from 'next/cache';

export async function submitLaunch(formData) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Lansman yapmak için giriş yapmalısınız.' };
  }

  const toolId = formData.get('toolId');
  const tagline = formData.get('tagline');
  const galleryImages = formData.getAll('galleryImages');

  if (!toolId || !tagline) {
    return { error: 'Araç seçimi ve slogan zorunludur.' };
  }

  const imageUrls = [];
  for (const imageFile of galleryImages) {
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${user.id}/launches/${toolId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('launch-gallery-images')
        .upload(filePath, imageFile);

      if (uploadError) {
        console.error('Lansman görseli yükleme hatası:', uploadError);
        return { error: 'Görseller yüklenirken bir hata oluştu.' };
      }

      const { data } = supabase.storage.from('launch-gallery-images').getPublicUrl(filePath);
      imageUrls.push(data.publicUrl);
    }
  }

  const { data: newLaunch, error: insertError } = await supabase
    .from('launches')
    .insert({
      tool_id: toolId,
      user_id: user.id,
      tagline,
      description: formData.get('description'),
      gallery_image_urls: imageUrls,
      youtube_video_url: formData.get('youtube_video_url'),
      is_approved: false,
      vote_count: 1,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Lansman kaydetme hatası:', insertError);
    return { error: 'Lansmanınız kaydedilirken bir hata oluştu.' };
  }

  await supabase.from('launch_votes').insert({ launch_id: newLaunch.id, user_id: user.id });

  revalidatePath('/launchpad');
  return {
    success: 'Lansmanınız başarıyla gönderildi! Onaylandıktan sonra yayınlanacaktır.',
  };
}

export async function toggleLaunchVote(formData) {
  'use server';
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oylama yapmak için giriş yapmalısınız.' };

  const launchId = formData.get('launchId');
  if (!launchId) return { error: "Lansman ID'si bulunamadı." };

  const { data: existingVote } = await supabase
    .from('launch_votes')
    .select('launch_id')
    .eq('user_id', user.id)
    .eq('launch_id', launchId)
    .maybeSingle();

  if (existingVote) {
    await supabase.from('launch_votes').delete().match({ user_id: user.id, launch_id: launchId });
    await supabase.rpc('decrement_launch_vote', { p_launch_id: launchId });
  } else {
    await supabase.from('launch_votes').insert({ user_id: user.id, launch_id: launchId });
    await supabase.rpc('increment_launch_vote', { p_launch_id: launchId });
  }

  revalidatePath('/launchpad');
  return { success: true };
}
