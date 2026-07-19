'use server';

import logger from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { slugify } from '@/utils/slugify';
import { contentEmailHtml, sendContentEventEmail } from '@/lib/contentNotify';

const CREATOR_EDITABLE_STATUSES = new Set(['Taslak', 'İncelemede', 'Reddedildi']);
/** Soft gate: users below this reputation still can be admin-approved manually. */
const MIN_CREATOR_REPUTATION = Number(process.env.CONTENT_CREATOR_MIN_REPUTATION || 10);

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
    .select('is_content_creator, username, email, reputation_points')
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

  // Always close open application alerts for this user when admin acts.
  try {
    const { data: openAlerts } = await admin
      .from('admin_alerts')
      .select('id, metadata')
      .eq('alert_type', 'content_creator_application')
      .eq('status', 'Açık')
      .limit(50);
    const ids = (openAlerts || [])
      .filter((row) => row?.metadata?.user_id === targetId)
      .map((row) => row.id);
    if (ids.length) {
      await admin
        .from('admin_alerts')
        .update({ status: 'Çözüldü', resolved_at: new Date().toISOString() })
        .in('id', ids);
    }
  } catch (alertError) {
    logger.error('close creator application alerts', alertError);
  }

  const statusMessage = enabled
    ? 'İçerik üretici başvurun onaylandı. İçerik stüdyosundan yazı gönderebilirsin.'
    : note === 'application_rejected'
      ? 'İçerik üretici başvurun şu an onaylanmadı. Daha sonra tekrar deneyebilirsin.'
      : 'İçerik üretici yetkin kaldırıldı.';

  try {
    await admin.from('notifications').insert({
      user_id: targetId,
      event_type: enabled ? 'content_creator_approved' : 'content_creator_revoked',
      message: statusMessage,
      link: enabled ? '/icerik' : '/blog',
      is_read: false,
    });
  } catch (notifyError) {
    logger.error('creator status notify', notifyError);
  }

  const targetProfile = await getProfileFlags(targetId);
  if (targetProfile?.email) {
    await sendContentEventEmail({
      to: targetProfile.email,
      subject: enabled ? 'İçerik üretici onayın' : 'İçerik üretici başvurun',
      html: contentEmailHtml({
        title: enabled ? 'Onaylandın 🎉' : 'Başvuru güncellemesi',
        body: statusMessage,
        ctaLabel: enabled ? 'İçerik stüdyosuna git' : 'Blogu incele',
        ctaUrl: enabled ? '/icerik' : '/blog',
      }),
    });
  }

  revalidatePath('/dashboard');
  revalidatePath('/admin');
  revalidatePath('/icerik');
  return {
    success: true,
    message: enabled
      ? 'Kullanıcı içerik üretici olarak onaylandı.'
      : note === 'application_rejected'
        ? 'Başvuru reddedildi.'
        : 'İçerik üretici yetkisi kaldırıldı.',
  };
}

/**
 * Logged-in member requests content creator access.
 * Creates an admin_alert (no extra schema required).
 */
export async function requestContentCreatorAccess(formData) {
  const { user, error } = await requireUser();
  if (error) return { error };

  if (isAdminUser(user)) {
    return { error: 'Admin zaten tüm içerik yetkilerine sahip.' };
  }

  const profile = await getProfileFlags(user.id);
  if (profile?.is_content_creator) {
    return { error: 'Zaten içerik üreticisisin.', success: true };
  }

  const pitch = String(formData?.get?.('pitch') || formData?.pitch || '')
    .trim()
    .slice(0, 800);
  if (pitch.length < 20) {
    return { error: 'Kısa bir tanıtım yaz (en az 20 karakter).' };
  }

  const reputation = Number(profile?.reputation_points || 0);
  if (reputation < MIN_CREATOR_REPUTATION) {
    return {
      error: `Üretici başvurusu için en az ${MIN_CREATOR_REPUTATION} itibar puanı önerilir (şu an: ${reputation}). Yorum, favori ve katkı ile puanını yükseltip tekrar dene.`,
    };
  }

  const admin = createAdminClient();

  // Prevent spam: one open application at a time.
  const { data: openAlerts } = await admin
    .from('admin_alerts')
    .select('id, metadata, status')
    .eq('alert_type', 'content_creator_application')
    .eq('status', 'Açık')
    .limit(100);
  const alreadyOpen = (openAlerts || []).some((row) => row?.metadata?.user_id === user.id);
  if (alreadyOpen) {
    return {
      success: true,
      message: 'Başvurun zaten incelemede. Onaylandığında bildirim alacaksın.',
    };
  }

  const username = profile?.username || null;
  const email = profile?.email || user.email || null;
  const { error: alertError } = await admin.from('admin_alerts').insert({
    alert_type: 'content_creator_application',
    description: `İçerik üretici başvurusu: ${username || email || user.id} — ${pitch}`,
    link: '/dashboard',
    status: 'Açık',
    metadata: {
      user_id: user.id,
      email,
      username,
      pitch,
    },
  });

  if (alertError) {
    logger.error('requestContentCreatorAccess', alertError);
    return { error: 'Başvuru kaydedilemedi. Biraz sonra tekrar dene.' };
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/icerik');
  return {
    success: true,
    message: 'Başvurun alındı. Admin onayından sonra içerik stüdyosu açılacak.',
  };
}

export async function hasOpenCreatorApplication(userId) {
  if (!userId) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from('admin_alerts')
    .select('id, metadata, status')
    .eq('alert_type', 'content_creator_application')
    .eq('status', 'Açık')
    .limit(100);
  return (data || []).some((row) => row?.metadata?.user_id === userId);
}

export async function getCreatorApplications() {
  const { user, error } = await requireUser();
  if (error || !isAdminUser(user)) return [];
  const admin = createAdminClient();
  const { data, error: qError } = await admin
    .from('admin_alerts')
    .select('id, description, metadata, status, created_at')
    .eq('alert_type', 'content_creator_application')
    .eq('status', 'Açık')
    .order('created_at', { ascending: true });
  if (qError) {
    logger.error('getCreatorApplications', qError);
    return [];
  }
  return data || [];
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

  const categoryRaw = formData.get('category_id');
  const categoryId =
    categoryRaw === '' || categoryRaw == null ? null : parseInt(String(categoryRaw), 10);

  const updates = {
    title: String(formData.get('title') || '').trim(),
    slug: String(formData.get('slug') || existing.slug).trim(),
    content: String(formData.get('content') || ''),
    description: String(formData.get('description') || '').trim(),
    type: String(formData.get('type') || 'Yazı').trim(),
    status: nextStatus,
    category_id: Number.isFinite(categoryId) ? categoryId : null,
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

/** Pull a post back from review into draft. */
export async function withdrawCreatorPostFromReview(formData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) return { error: 'Yazı bulunamadı.' };

  const payload = new FormData();
  for (const [k, v] of formData.entries()) payload.set(k, v);
  payload.set('status', 'Taslak');
  const result = await updateCreatorPost(payload);
  if (result.error) return result;
  return { success: 'İnceleme geri çekildi. Yazı tekrar taslak.' };
}

/** Assign tags to a creator-owned post (admin client after auth checks). */
export async function assignCreatorPostTags(formData) {
  const { user, error } = await requireUser();
  if (error) return { error };

  const postId = String(formData.get('postId') || formData.get('id') || '').trim();
  if (!postId) return { error: "Yazı ID'si bulunamadı." };

  const tagIds = formData
    .getAll('tagId')
    .map((id) => parseInt(String(id), 10))
    .filter((id) => Number.isFinite(id));

  const admin = createAdminClient();
  const { data: existing, error: loadError } = await admin
    .from('posts')
    .select('id, author_id, status')
    .eq('id', postId)
    .maybeSingle();
  if (loadError || !existing) return { error: 'Yazı bulunamadı.' };

  const adminUser = isAdminUser(user);
  if (!adminUser && existing.author_id !== user.id) return { error: 'Yetkiniz yok.' };
  if (!adminUser && !CREATOR_EDITABLE_STATUSES.has(existing.status)) {
    return { error: 'Yayınlanmış yazının etiketleri üretici tarafından değiştirilemez.' };
  }
  if (!adminUser) {
    const profile = await getProfileFlags(user.id);
    if (!profile?.is_content_creator) return { error: 'İçerik üretici yetkisi yok.' };
  }

  await admin.from('post_tags').delete().eq('post_id', postId);
  if (tagIds.length > 0) {
    const { error: insertError } = await admin
      .from('post_tags')
      .insert(tagIds.map((tagId) => ({ post_id: postId, tag_id: tagId })));
    if (insertError) {
      logger.error('assignCreatorPostTags', insertError);
      return { error: 'Etiketler kaydedilemedi.' };
    }
  }

  revalidatePath(`/icerik/${postId}/edit`);
  revalidatePath('/icerik');
  revalidatePath('/blog');
  return { success: true };
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
    .select('id, status, slug, published_at, author_id, title')
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

  // Notify creator (in-app + email) when preference allows.
  if (existing.author_id) {
    try {
      const { data: authorProfile } = await admin
        .from('profiles')
        .select('notify_on_content_approval, email, username')
        .eq('id', existing.author_id)
        .maybeSingle();
      if (authorProfile?.notify_on_content_approval !== false) {
        const published = decision === 'publish';
        const message = published
          ? `"${existing.title}" yayınlandı.`
          : `"${existing.title}" reddedildi.${note ? ` Not: ${note}` : ''}`;
        const link = published && existing.slug ? `/blog/${existing.slug}` : '/icerik';
        await admin.from('notifications').insert({
          user_id: existing.author_id,
          event_type: published ? 'content_published' : 'content_rejected',
          message,
          link,
          is_read: false,
        });
        if (authorProfile.email) {
          await sendContentEventEmail({
            to: authorProfile.email,
            subject: published ? 'Yazın yayınlandı' : 'Yazın hakkında güncelleme',
            html: contentEmailHtml({
              title: published ? 'Yayında ✨' : 'İnceleme sonucu',
              body: message,
              ctaLabel: published ? 'Yazıyı oku' : 'Stüdyoya dön',
              ctaUrl: link,
            }),
          });
        }
      }
    } catch (notifyError) {
      logger.error('content review notify failed', notifyError);
    }
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
