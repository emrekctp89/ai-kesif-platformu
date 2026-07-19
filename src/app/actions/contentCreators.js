'use server';

import logger from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { slugify } from '@/utils/slugify';

const CREATOR_EDITABLE_STATUSES = new Set(['Taslak', 'İncelemede', 'Reddedildi']);

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Giriş yapmalısınız.', user: null, supabase };
  return { user, supabase, error: null };
}

function isAdminUser(user) {
  return Boolean(user?.email && user.email === process.env.ADMIN_EMAIL);
}

async function getProfileFlags(userId) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('is_content_creator, username, email')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    logger.error('content creator profile read', error);
    return null;
  }
  return data;
}

export async function isCurrentUserContentCreator() {
  const { user, error } = await requireUser();
  if (error || !user) return false;
  if (isAdminUser(user)) return true;
  const profile = await getProfileFlags(user.id);
  return Boolean(profile?.is_content_creator);
}

export async function setContentCreatorStatus({ userId, enabled, note } = {}) {
  const { user, error } = await requireUser();
  if (error) return { error };
  if (!isAdminUser(user)) return { error: 'Yetkiniz yok.' };

  const targetId = String(userId || '').trim();
  if (!targetId) return { error: 'Kullanıcı seçilmedi.' };

  const admin = createAdminClient();
  const updates = {
    is_content_creator: Boolean(enabled),
    content_creator_note: note ? String(note).slice(0, 500) : null,
    updated_at: new Date().toISOString(),
  };
  if (enabled) {
    updates.content_creator_since = new Date().toISOString();
  }

  const { error: updateError } = await admin.from('profiles').update(updates).eq('id', targetId);
  if (updateError) {
    logger.error('setContentCreatorStatus', updateError);
    return { error: 'İçerik üretici durumu güncellenemedi.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/icerik');
  return {
    success: true,
    message: enabled
      ? 'Kullanıcı içerik üretici olarak onaylandı.'
      : 'İçerik üretici yetkisi kaldırıldı.',
  };
}

export async function createCreatorPost(formData) {
  const { user, error } = await requireUser();
  if (error) return { error };
  if (!isAdminUser(user)) {
    const profile = await getProfileFlags(user.id);
    if (!profile?.is_content_creator) {
      return { error: 'İçerik üretmek için onaylı üretici olmalısınız.' };
    }
  }

  const title = String(formData.get('title') || '').trim();
  const type = String(formData.get('type') || 'Yazı').trim() || 'Yazı';
  if (!title) return { error: 'Başlık zorunludur.' };
  if (!['Yazı', 'Rehber'].includes(type)) return { error: 'Geçersiz yazı tipi.' };

  const admin = createAdminClient();
  const slug = `${slugify(title)}-${Date.now().toString(36)}`;
  const { data: newPost, error: insertError } = await admin
    .from('posts')
    .insert({
      title,
      slug,
      author_id: user.id,
      content: `# ${title}\n\nBuraya yazınızı yazmaya başlayın...`,
      type,
      status: 'Taslak',
      description: '',
    })
    .select('id')
    .single();

  if (insertError) {
    logger.error('createCreatorPost', insertError);
    return { error: 'Taslak oluşturulamadı.' };
  }

  revalidatePath('/icerik');
  redirect(`/icerik/${newPost.id}/edit`);
}

export async function updateCreatorPost(formData) {
  const { user, error } = await requireUser();
  if (error) return { error };

  const id = String(formData.get('id') || '').trim();
  if (!id) return { error: 'Yazı bulunamadı.' };

  const admin = createAdminClient();
  const { data: existing, error: loadError } = await admin
    .from('posts')
    .select('id, author_id, status, slug, published_at')
    .eq('id', id)
    .maybeSingle();

  if (loadError || !existing) return { error: 'Yazı bulunamadı.' };

  const adminUser = isAdminUser(user);
  if (!adminUser && existing.author_id !== user.id) return { error: 'Yetkiniz yok.' };
  if (!adminUser && !CREATOR_EDITABLE_STATUSES.has(existing.status)) {
    return { error: 'Yayınlanmış yazıyı üretici düzenleyemez.' };
  }
  if (!adminUser) {
    const profile = await getProfileFlags(user.id);
    if (!profile?.is_content_creator) return { error: 'İçerik üretici yetkisi yok.' };
  }

  const nextStatus = String(formData.get('status') || existing.status).trim();
  if (!adminUser && !CREATOR_EDITABLE_STATUSES.has(nextStatus)) {
    return { error: 'Geçersiz durum. Yayınlama yalnızca admin onayından sonra yapılır.' };
  }

  const updates = {
    title: String(formData.get('title') || '').trim(),
    slug: String(formData.get('slug') || existing.slug).trim(),
    content: String(formData.get('content') || ''),
    description: String(formData.get('description') || '').trim(),
    type: String(formData.get('type') || 'Yazı').trim(),
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (!updates.title) return { error: 'Başlık zorunludur.' };

  if (nextStatus === 'İncelemede' && existing.status !== 'İncelemede') {
    updates.submitted_at = new Date().toISOString();
  }
  if (nextStatus === 'Taslak' || nextStatus === 'Reddedildi') {
    // keep submitted_at history
  }

  const { error: updateError } = await admin.from('posts').update(updates).eq('id', id);
  if (updateError) {
    logger.error('updateCreatorPost', updateError);
    return { error: updateError.message || 'Kayıt başarısız.' };
  }

  revalidatePath('/icerik');
  revalidatePath(`/icerik/${id}/edit`);
  revalidatePath('/admin');
  revalidatePath('/blog');
  return { success: 'Taslak kaydedildi.' };
}

export async function submitCreatorPostForReview(formData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) return { error: 'Yazı bulunamadı.' };

  const payload = new FormData();
  for (const [k, v] of formData.entries()) payload.set(k, v);
  payload.set('status', 'İncelemede');
  const result = await updateCreatorPost(payload);
  if (result.error) return result;
  return { success: 'İncelemeye gönderildi. Admin onayından sonra yayınlanır.' };
}

export async function adminReviewCreatorPost(formData) {
  const { user, error } = await requireUser();
  if (error) return { error };
  if (!isAdminUser(user)) return { error: 'Yetkiniz yok.' };

  const id = String(formData.get('id') || '').trim();
  const decision = String(formData.get('decision') || '').trim(); // publish | reject
  const note = String(formData.get('review_note') || '')
    .trim()
    .slice(0, 1000);
  if (!id) return { error: 'Yazı bulunamadı.' };
  if (!['publish', 'reject'].includes(decision)) return { error: 'Geçersiz karar.' };

  const admin = createAdminClient();
  const { data: existing, error: loadError } = await admin
    .from('posts')
    .select('id, status, slug, published_at')
    .eq('id', id)
    .maybeSingle();
  if (loadError || !existing) return { error: 'Yazı bulunamadı.' };

  const updates = {
    review_note: note || null,
    updated_at: new Date().toISOString(),
  };

  if (decision === 'publish') {
    updates.status = 'Yayınlandı';
    if (!existing.published_at) updates.published_at = new Date().toISOString();
  } else {
    updates.status = 'Reddedildi';
  }

  const { error: updateError } = await admin.from('posts').update(updates).eq('id', id);
  if (updateError) {
    logger.error('adminReviewCreatorPost', updateError);
    return { error: 'İnceleme kaydedilemedi.' };
  }

  revalidatePath('/admin');
  revalidatePath('/icerik');
  revalidatePath('/blog');
  if (existing.slug) revalidatePath(`/blog/${existing.slug}`);

  return {
    success: decision === 'publish' ? 'Yazı yayınlandı.' : 'Yazı reddedildi.',
  };
}

export async function getCreatorPostsForCurrentUser() {
  const { user, error } = await requireUser();
  if (error || !user) return [];
  const admin = createAdminClient();
  const { data, error: qError } = await admin
    .from('posts')
    .select('id, title, slug, status, type, updated_at, submitted_at, published_at, review_note')
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false });
  if (qError) {
    logger.error('getCreatorPostsForCurrentUser', qError);
    return [];
  }
  return data || [];
}

export async function getPostsPendingReview() {
  const { user, error } = await requireUser();
  if (error || !isAdminUser(user)) return [];
  const admin = createAdminClient();
  const { data, error: qError } = await admin
    .from('posts')
    .select(
      'id, title, slug, status, type, submitted_at, updated_at, author_id, profiles:author_id(username, email)'
    )
    .eq('status', 'İncelemede')
    .order('submitted_at', { ascending: true, nullsFirst: false });
  if (qError) {
    // Fallback without embed if FK name differs
    logger.error('getPostsPendingReview', qError);
    const { data: plain } = await admin
      .from('posts')
      .select('id, title, slug, status, type, submitted_at, updated_at, author_id')
      .eq('status', 'İncelemede')
      .order('updated_at', { ascending: true });
    return plain || [];
  }
  return data || [];
}
