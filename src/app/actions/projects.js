'use server';

import logger from '@/utils/logger';

import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { slugify } from '@/utils/slugify';

export async function createProject(formData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Bu işlem için giriş yapmalısınız.' };
  }

  const title = formData.get('title');
  if (!title) {
    return { error: 'Proje başlığı boş olamaz.' };
  }

  const slug = slugify(title) + '-' + Date.now().toString(36);

  const { data: newProject, error } = await supabase
    .from('projects')
    .insert({ title, slug, user_id: user.id, description: '' })
    .select('id')
    .single();

  if (error) {
    logger.error('Proje oluşturma hatası:', error);
    return { error: 'Proje oluşturulurken bir hata oluştu.' };
  }

  redirect(`/profile/projects/${newProject.id}/edit`);
}

export async function updateProject(formData) {
  'use server';
  const supabase = await createClient();

  const id = formData.get('id');
  const title = formData.get('title');
  const description = formData.get('description');

  const { error } = await supabase
    .from('projects')
    .update({ title, description, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logger.error('Proje güncelleme hatası:', error);
    return { error: 'Proje güncellenirken bir hata oluştu.' };
  }

  revalidatePath(`/profile/projects/${id}/edit`);
  revalidatePath('/profile');
  return { success: 'Proje başarıyla güncellendi.' };
}

export async function deleteProject(formData) {
  'use server';
  const supabase = await createClient();
  const id = formData.get('id');

  const { error } = await supabase.from('projects').delete().eq('id', id);

  if (error) {
    logger.error('Proje silme hatası:', error);
    return { error: 'Proje silinirken bir hata oluştu.' };
  }

  redirect('/profile');
}

export async function updateProjectItems(formData) {
  'use server';
  const supabase = await createClient();

  const projectId = formData.get('projectId');
  const items = JSON.parse(formData.get('items') || '[]');

  if (!projectId) {
    return { error: "Proje ID'si bulunamadı." };
  }

  const { error: deleteError } = await supabase
    .from('project_items')
    .delete()
    .eq('project_id', projectId);

  if (deleteError) {
    logger.error('Eski proje içerikleri silme hatası:', deleteError);
    return { error: 'Proje güncellenirken bir hata oluştu.' };
  }

  if (items.length > 0) {
    const newItems = items.map((item) => ({
      project_id: projectId,
      item_id: item.item_id,
      item_type: item.item_type,
    }));

    const { error: insertError } = await supabase.from('project_items').insert(newItems);

    if (insertError) {
      logger.error('Yeni proje içerikleri ekleme hatası:', insertError);
      return { error: 'Proje güncellenirken bir hata oluştu.' };
    }
  }

  revalidatePath(`/profile/projects/${projectId}/edit`);
  return { success: 'Projedeki içerikler güncellendi.' };
}

export async function getAiProjectStrategy(projectId) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Bu özelliği kullanmak için giriş yapmalısınız.' };
  }

  if (!projectId) {
    return { error: "Proje ID'si bulunamadı." };
  }

  try {
    const { data: projectData, error: projectError } = await supabase.rpc(
      'get_project_details_for_ai',
      { p_project_id: projectId }
    );

    if (projectError || !projectData) {
      throw new Error('Proje detayları veritabanından alınamadı.');
    }

    const formattedData = `
      Proje Başlığı: ${projectData.title}
      Proje Açıklaması: ${projectData.description}

      Projeye Eklenen Araçlar:
      ${projectData.tools?.map((t) => `- ${t.name}: ${t.description}`).join('\n') || 'Yok'}

      Projeye Eklenen Eserler:
      ${projectData.showcase_items?.map((s) => `- ${s.title}: ${s.description}`).join('\n') || 'Yok'}

      Projeye Eklenen Prompt'lar:
      ${projectData.prompts?.map((p) => `- ${p.title}: "${p.prompt_text}"`).join('\n') || 'Yok'}
    `;

    const prompt = `
      Sen bir proje yönetimi ve yapay zeka stratejistisin. Sana bir kullanıcının projesine eklediği araçların, eserlerin ve prompt'ların bir listesini vereceğim. 
      
      PROJE VERİLERİ:
      ${formattedData}

      GÖREVİN: Bu verilere dayanarak, kullanıcının projesini daha da ileriye taşıması için stratejik tavsiyeler sunmaktır. Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
    `;

    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            project_summary: {
              type: 'STRING',
              description: 'Projenin genel amacını ve durumunu 2 cümleyle özetle.',
            },
            strategic_suggestions: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description:
                'Projenin hedefine ulaşması için 3 adet somut ve yaratıcı stratejik öneri sun.',
            },
            potential_tools: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description:
                'Bu projeye fayda sağlayabilecek, listede olmayan 2 farklı araç türü öner.',
            },
          },
          required: ['project_summary', 'strategic_suggestions', 'potential_tools'],
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

    if (!response.ok) {
      const errorBody = await response.json();
      return {
        error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}`,
      };
    }

    const result = await response.json();

    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return {
        success: true,
        data: JSON.parse(result.candidates[0].content.parts[0].text),
      };
    } else {
      return {
        error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.',
      };
    }
  } catch (e) {
    logger.error('AI Stratejist fonksiyonunda genel hata:', e);
    return { error: 'Analiz oluşturulurken beklenmedik bir hata oluştu.' };
  }
}
