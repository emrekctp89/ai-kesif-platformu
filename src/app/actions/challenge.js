import logger from '@/utils/logger';
('use server');

import { createClient } from '@/utils/supabase/actions';
import { revalidatePath } from 'next/cache';

export async function submitToShowcaseChallenge(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Bu işlem için giriş yapmalısınız.' };

  const showcaseItemId = formData.get('showcaseItemId');
  const challengeId = formData.get('challengeId');

  if (!showcaseItemId || !challengeId) {
    return { error: 'Gerekli bilgiler eksik.' };
  }

  const { error } = await supabase.from('challenge_submissions').insert({
    challenge_id: challengeId,
    showcase_item_id: showcaseItemId,
    user_id: user.id,
  });

  if (error) {
    if (error.code === '23505') return { error: 'Bu eseri bu yarışmaya zaten göndermişsiniz.' };
    logger.error('Yarışmaya eser gönderme hatası:', error);
    return { error: 'Eser gönderilirken bir hata oluştu.' };
  }

  revalidatePath('/yarisma');
  return { success: 'Eseriniz başarıyla yarışmaya gönderildi!' };
}

export async function toggleChallengeVote(formData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oylama yapmak için giriş yapmalısınız.' };

  const submissionId = formData.get('submissionId');
  if (!submissionId) return { error: "Gönderim ID'si bulunamadı." };

  const { data: existingVote } = await supabase
    .from('challenge_submission_votes')
    .select('submission_id')
    .eq('user_id', user.id)
    .eq('submission_id', submissionId)
    .maybeSingle();

  if (existingVote) {
    await supabase
      .from('challenge_submission_votes')
      .delete()
      .match({ user_id: user.id, submission_id: submissionId });
  } else {
    await supabase
      .from('challenge_submission_votes')
      .insert({ user_id: user.id, submission_id: submissionId });
  }

  revalidatePath('/yarisma');
  return { success: true };
}

export async function createChallengeManually(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Bu işlem için yetkiniz yok.' };
  }

  const title = formData.get('title');
  const description = formData.get('description');
  const startDate = formData.get('start_date');
  const endDate = formData.get('end_date');

  if (!title || !startDate || !endDate) {
    return { error: 'Başlık, başlangıç ve bitiş tarihleri zorunludur.' };
  }

  const { error } = await supabase.from('challenges').insert({
    title,
    description,
    start_date: startDate,
    end_date: endDate,
    status: 'Aktif',
  });

  if (error) {
    logger.error('Manuel yarışma oluşturma hatası:', error);
    return { error: 'Yarışma oluşturulurken bir hata oluştu.' };
  }

  revalidatePath('/admin');
  revalidatePath('/yarisma');
  return { success: 'Yeni yarışma başarıyla oluşturuldu!' };
}

export async function generateChallengeIdeasWithAi(topic) {
  'use server';
  if (!topic) return { error: 'Lütfen bir konu girin.' };

  try {
    const prompt = `
      Sen, yapay zeka ile içerik üreten bir topluluk için YARIŞMA TEMALARI üreten bir yaratıcılık asistanısın. Sana verilen konuya dayanarak, kullanıcıları heyecanlandıracak ve katılıma teşvik edecek, 1 adet dikkat çekici başlık (title) ve 1 adet ilham verici kısa açıklama (description) üret.

      ANA KONU: "${topic}"

      Cevabını SADECE aşağıdaki JSON formatında ver.
    `;

    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING' },
          },
          required: ['title', 'description'],
        },
      },
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: 'Gemini API anahtarı bulunamadı.' };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return { error: `Yapay zeka modelinden hata alındı.` };

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { success: true, data: JSON.parse(result.candidates[0].content.parts[0].text) };
    } else {
      return { error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.' };
    }
  } catch (e) {
    logger.error('Yarışma fikri üretme hatası:', e.message);
    return { error: `Bir hata oluştu.` };
  }
}

export async function updateChallenge(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Bu işlem için yetkiniz yok.' };
  }

  const id = formData.get('id');
  const title = formData.get('title');
  const description = formData.get('description');
  const startDate = formData.get('start_date');
  const endDate = formData.get('end_date');
  const status = formData.get('status');

  if (!id || !title || !startDate || !endDate || !status) {
    return { error: 'Tüm alanlar zorunludur.' };
  }

  const { error } = await supabase
    .from('challenges')
    .update({ title, description, start_date: startDate, end_date: endDate, status })
    .eq('id', id);

  if (error) {
    logger.error('Yarışma güncelleme hatası:', error);
    return { error: 'Yarışma güncellenirken bir hata oluştu.' };
  }

  revalidatePath('/admin');
  revalidatePath('/yarisma');
  return { success: 'Yarışma başarıyla güncellendi!' };
}

export async function submitShowcaseToChallenge(formData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Bu işlem için giriş yapmalısınız.' };
  }

  const showcaseItemId = formData.get('showcaseItemId');
  if (!showcaseItemId) {
    return { error: "Eser ID'si bulunamadı." };
  }

  const { data: activeChallenge, error: challengeError } = await supabase
    .from('challenges')
    .select('id')
    .eq('status', 'Aktif')
    .lte('start_date', 'now()::date')
    .gte('end_date', 'now()::date')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  if (challengeError || !activeChallenge) {
    return { error: 'Şu anda katılabileceğiniz aktif bir yarışma bulunmuyor.' };
  }

  const { data: showcaseOwner } = await supabase
    .from('showcase_items')
    .select('user_id')
    .eq('id', showcaseItemId)
    .single();
  if (showcaseOwner?.user_id !== user.id) {
    return { error: 'Sadece kendi eserinizi yarışmaya gönderebilirsiniz.' };
  }

  const { error } = await supabase.from('challenge_submissions').insert({
    challenge_id: activeChallenge.id,
    showcase_item_id: showcaseItemId,
    user_id: user.id,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'Bu eseri bu yarışmaya zaten göndermişsiniz.' };
    }
    logger.error('Yarışmaya gönderme hatası:', error);
    return { error: 'Eser yarışmaya gönderilirken bir hata oluştu.' };
  }

  revalidatePath('/yarisma');
  revalidatePath('/profile');
  return { success: 'Eseriniz başarıyla yarışmaya gönderildi!' };
}
