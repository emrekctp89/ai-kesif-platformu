'use server';

import { createClient } from '@/utils/supabase/actions';
import { revalidatePath } from 'next/cache';

export async function createBounty(formData) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Bu işlem için giriş yapmalısınız.' };
  }

  const title = formData.get('title');
  const description = formData.get('description');
  const reward = parseInt(formData.get('reward'), 10);

  if (!title || !reward || reward <= 0) {
    return { error: 'Başlık ve geçerli bir ödül puanı zorunludur.' };
  }

  const isAdmin = user.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('reputation_points')
      .eq('id', user.id)
      .single();
    if (!profile || profile.reputation_points < reward) {
      return { error: 'Bu ödülü oluşturmak için yeterli itibar puanınız yok.' };
    }
  }

  const { data: newBounty, error } = await supabase
    .from('bounties')
    .insert({ title, description, reputation_reward: reward, user_id: user.id })
    .select('id')
    .single();

  if (error) {
    console.error('Ödül oluşturma hatası:', error);
    return { error: 'Ödül ilanı oluşturulurken bir hata oluştu.' };
  }

  revalidatePath('/odul-avciligi');
  return { success: 'Ödül ilanı başarıyla oluşturuldu!' };
}

export async function submitToBounty(formData) {
  'use server';
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Öneri yapmak için giriş yapmalısınız.' };

  const bountyId = formData.get('bountyId');
  const toolId = formData.get('toolId');
  const notes = formData.get('notes');

  if (!bountyId || !toolId) return { error: 'Gerekli bilgiler eksik.' };

  const { error } = await supabase.from('bounty_submissions').insert({
    bounty_id: bountyId,
    tool_id: toolId,
    user_id: user.id,
    notes,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'Bu araç bu ödüle zaten önerilmiş.' };
    }
    console.error('Öneri gönderme hatası:', error);
    return { error: 'Öneri gönderilirken bir hata oluştu.' };
  }

  revalidatePath(`/odul-avciligi/${bountyId}`);
  return { success: 'Öneriniz başarıyla gönderildi.' };
}

export async function acceptBountySubmission(formData) {
  'use server';
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Bu işlem için giriş yapmalısınız.' };

  const submissionId = formData.get('submissionId');
  if (!submissionId) return { error: "Öneri ID'si bulunamadı." };

  const { error } = await supabase.rpc('accept_bounty_submission', {
    p_submission_id: submissionId,
    p_bounty_creator_id: user.id,
  });

  if (error) {
    console.error('Öneri kabul etme hatası:', error);
    return { error: error.message };
  }

  revalidatePath('/odul-avciligi');
  return { success: 'Kazanan öneri seçildi ve ödül dağıtıldı!' };
}
