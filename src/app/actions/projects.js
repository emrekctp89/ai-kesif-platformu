'use server';

import logger from '@/utils/logger';

import { createClient } from '@/utils/supabase/actions';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { slugify } from '@/utils/slugify';

const AUTH_REQUIRED_ERROR = 'Bu işlem için giriş yapmalısınız.';
const PROJECT_ACCESS_ERROR = 'Proje bulunamadı veya bu işlem için yetkiniz yok.';

async function authorizeProjectOwner(supabase, projectId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: AUTH_REQUIRED_ERROR };
  if (!projectId) return { error: "Proje ID'si bulunamadı." };

  const { data: project, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !project) {
    return { error: PROJECT_ACCESS_ERROR };
  }

  return { user };
}

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

  const authorization = await authorizeProjectOwner(supabase, id);
  if (authorization.error) return authorization;
  if (!title?.trim()) return { error: 'Proje başlığı boş olamaz.' };

  const { error } = await supabase
    .from('projects')
    .update({ title: title.trim(), description, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', authorization.user.id);

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

  const authorization = await authorizeProjectOwner(supabase, id);
  if (authorization.error) return authorization;

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', authorization.user.id);

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
  let items;
  try {
    items = JSON.parse(formData.get('items') || '[]');
  } catch {
    return { error: 'Proje içerikleri geçerli bir formatta değil.' };
  }

  if (!Array.isArray(items)) return { error: 'Proje içerikleri geçerli bir formatta değil.' };

  const authorization = await authorizeProjectOwner(supabase, projectId);
  if (authorization.error) return authorization;

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
  const authorization = await authorizeProjectOwner(supabase, projectId);
  if (authorization.error) return authorization;

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

    const { generateProjectStrategyWithKasif } = await import('@/lib/kasif/server');
    const { data, source } = await generateProjectStrategyWithKasif({
      formattedData,
      title: projectData.title,
      toolNames: (projectData.tools || []).map((t) => t.name).filter(Boolean),
    });

    if (!data?.project_summary || !Array.isArray(data?.strategic_suggestions)) {
      return { error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.' };
    }

    return { success: true, data, source: source || 'local' };
  } catch (e) {
    logger.error('AI Stratejist (Kâşif) hatası:', e);
    return { error: 'Analiz oluşturulurken beklenmedik bir hata oluştu.' };
  }
}
