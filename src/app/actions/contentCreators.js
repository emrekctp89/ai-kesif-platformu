'use server';

import logger from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { slugify } from '@/utils/slugify';
import { uploadToGCS } from '@/utils/gcs';
import { contentEmailHtml, sendContentEventEmail } from '@/lib/contentNotify';
import { MIN_CREATOR_REPUTATION } from '@/lib/contentCreatorRules';

const CREATOR_EDITABLE_STATUSES = new Set(['Taslak', 'İncelemede', 'Reddedildi']);
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ALLOWED_COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function normalizeFeaturedImageUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString().slice(0, 2000);
  } catch {
    return null;
  }
}

async function tStudio(key, values) {
  const t = await getTranslations('ContentStudio');
  return t(key, values);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: await tStudio('errLoginRequired'), user: null, supabase };
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
  if (!isAdminUser(user)) return { error: await tStudio('errForbidden') };

  const targetId = String(userId || '').trim();
  if (!targetId) return { error: await tStudio('errUserNotSelected') };

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
    return { error: await tStudio('errCreatorStatusUpdate') };
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
    ? await tStudio('notifyCreatorApproved')
    : note === 'application_rejected'
      ? await tStudio('notifyCreatorRejected')
      : await tStudio('notifyCreatorRevoked');

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
      subject: enabled
        ? await tStudio('emailSubjectApproved')
        : await tStudio('emailSubjectApplication'),
      html: contentEmailHtml({
        title: enabled
          ? await tStudio('emailTitleApproved')
          : await tStudio('emailTitleApplicationUpdate'),
        body: statusMessage,
        ctaLabel: enabled ? await tStudio('emailCtaStudio') : await tStudio('emailCtaBlog'),
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
      ? await tStudio('adminMsgCreatorApproved')
      : note === 'application_rejected'
        ? await tStudio('adminMsgApplicationRejected')
        : await tStudio('adminMsgCreatorRevoked'),
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
    return { error: await tStudio('errAdminAlreadyHasAccess') };
  }

  const profile = await getProfileFlags(user.id);
  if (profile?.is_content_creator) {
    return { error: await tStudio('errAlreadyCreator'), success: true };
  }

  const pitch = String(formData?.get?.('pitch') || formData?.pitch || '')
    .trim()
    .slice(0, 800);
  if (pitch.length < 20) {
    return { error: await tStudio('errPitchTooShort') };
  }

  const reputation = Number(profile?.reputation_points || 0);
  if (reputation < MIN_CREATOR_REPUTATION) {
    const remaining = MIN_CREATOR_REPUTATION - reputation;
    return {
      error: await tStudio('errReputationGate', {
        min: MIN_CREATOR_REPUTATION,
        current: reputation,
        remaining,
      }),
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
      message: await tStudio('successApplicationAlreadyPending'),
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
    return { error: await tStudio('errApplicationSaveFailed') };
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/icerik');
  return {
    success: true,
    message: await tStudio('successApplicationReceived'),
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
      return { error: await tStudio('errNeedApprovedCreator') };
    }
  }

  const title = String(formData.get('title') || '').trim();
  const type = String(formData.get('type') || 'Yazı').trim() || 'Yazı';
  if (!title) return { error: await tStudio('errTitleRequired') };
  if (!['Yazı', 'Rehber'].includes(type)) return { error: await tStudio('errInvalidType') };

  const admin = createAdminClient();
  const slug = `${slugify(title)}-${Date.now().toString(36)}`;
  const seedBody = await tStudio('draftBodySeed', { title });
  const { data: newPost, error: insertError } = await admin
    .from('posts')
    .insert({
      title,
      slug,
      author_id: user.id,
      content: seedBody,
      type,
      status: 'Taslak',
      description: '',
    })
    .select('id')
    .single();

  if (insertError) {
    logger.error('createCreatorPost', insertError);
    return { error: await tStudio('errDraftCreateFailed') };
  }

  revalidatePath('/icerik');
  redirect(`/icerik/${newPost.id}/edit`);
}

export async function updateCreatorPost(formData) {
  const { user, error } = await requireUser();
  if (error) return { error };

  const id = String(formData.get('id') || '').trim();
  if (!id) return { error: await tStudio('errPostNotFound') };

  const admin = createAdminClient();
  const { data: existing, error: loadError } = await admin
    .from('posts')
    .select('id, author_id, status, slug, published_at')
    .eq('id', id)
    .maybeSingle();

  if (loadError || !existing) return { error: await tStudio('errPostNotFound') };

  const adminUser = isAdminUser(user);
  if (!adminUser && existing.author_id !== user.id) return { error: await tStudio('errForbidden') };
  if (!adminUser && !CREATOR_EDITABLE_STATUSES.has(existing.status)) {
    return { error: await tStudio('errPublishedCreatorLocked') };
  }
  if (!adminUser) {
    const profile = await getProfileFlags(user.id);
    if (!profile?.is_content_creator) return { error: await tStudio('errNoCreatorPermission') };
  }

  const nextStatus = String(formData.get('status') || existing.status).trim();
  if (!adminUser && !CREATOR_EDITABLE_STATUSES.has(nextStatus)) {
    return { error: await tStudio('errInvalidStatus') };
  }

  const categoryRaw = formData.get('category_id');
  const categoryId =
    categoryRaw === '' || categoryRaw == null ? null : parseInt(String(categoryRaw), 10);

  const featuredRaw = formData.get('featured_image_url');
  const featuredProvided = featuredRaw != null;
  const featuredImageUrl = featuredProvided ? normalizeFeaturedImageUrl(featuredRaw) : undefined;
  if (featuredProvided && String(featuredRaw || '').trim() && featuredImageUrl == null) {
    return { error: await tStudio('errCoverInvalid') };
  }

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
  if (featuredProvided) {
    updates.featured_image_url = featuredImageUrl;
  }

  if (!updates.title) return { error: await tStudio('errTitleRequired') };

  if (nextStatus === 'İncelemede' && existing.status !== 'İncelemede') {
    updates.submitted_at = new Date().toISOString();
  }

  const { error: updateError } = await admin.from('posts').update(updates).eq('id', id);
  if (updateError) {
    logger.error('updateCreatorPost', updateError);
    return { error: updateError.message || (await tStudio('errSaveFailed')) };
  }

  revalidatePath('/icerik');
  revalidatePath(`/icerik/${id}/edit`);
  revalidatePath('/admin');
  revalidatePath('/blog');
  return { success: await tStudio('successDraftSaved') };
}

export async function submitCreatorPostForReview(formData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) return { error: await tStudio('errPostNotFound') };

  const payload = new FormData();
  for (const [k, v] of formData.entries()) payload.set(k, v);
  payload.set('status', 'İncelemede');
  const result = await updateCreatorPost(payload);
  if (result.error) return result;
  return { success: await tStudio('successSubmitted') };
}

/** Pull a post back from review into draft. */
export async function withdrawCreatorPostFromReview(formData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) return { error: await tStudio('errPostNotFound') };

  const payload = new FormData();
  for (const [k, v] of formData.entries()) payload.set(k, v);
  payload.set('status', 'Taslak');
  const result = await updateCreatorPost(payload);
  if (result.error) return result;
  return { success: await tStudio('successWithdrawn') };
}

/**
 * Delete a creator-owned draft (not published).
 * Allowed statuses: Taslak, Reddedildi, İncelemede (withdraws by delete).
 */
export async function deleteCreatorPost(formData) {
  const { user, error } = await requireUser();
  if (error) return { error };

  const id = String(formData.get('id') || '').trim();
  if (!id) return { error: await tStudio('errPostNotFound') };

  const admin = createAdminClient();
  const { data: existing, error: loadError } = await admin
    .from('posts')
    .select('id, author_id, status, slug')
    .eq('id', id)
    .maybeSingle();
  if (loadError || !existing) return { error: await tStudio('errPostNotFound') };

  const adminUser = isAdminUser(user);
  if (!adminUser && existing.author_id !== user.id) return { error: await tStudio('errForbidden') };
  if (!adminUser) {
    const profile = await getProfileFlags(user.id);
    if (!profile?.is_content_creator) return { error: await tStudio('errNoCreatorPermission') };
    if (existing.status === 'Yayınlandı') {
      return { error: await tStudio('errCannotDeletePublished') };
    }
  }

  // Clean join tables then post.
  await admin.from('post_tags').delete().eq('post_id', id);
  try {
    await admin.from('post_tools').delete().eq('post_id', id);
  } catch {
    // optional table
  }

  const { error: deleteError } = await admin.from('posts').delete().eq('id', id);
  if (deleteError) {
    logger.error('deleteCreatorPost', deleteError);
    return { error: await tStudio('errDeleteFailed') };
  }

  revalidatePath('/icerik');
  revalidatePath('/admin');
  revalidatePath('/blog');
  if (existing.slug) revalidatePath(`/blog/${existing.slug}`);
  return { success: await tStudio('successDeleted') };
}

/** Assign tags to a creator-owned post (admin client after auth checks). */
export async function assignCreatorPostTags(formData) {
  const { user, error } = await requireUser();
  if (error) return { error };

  const postId = String(formData.get('postId') || formData.get('id') || '').trim();
  if (!postId) return { error: await tStudio('errPostIdMissing') };

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
  if (loadError || !existing) return { error: await tStudio('errPostNotFound') };

  const adminUser = isAdminUser(user);
  if (!adminUser && existing.author_id !== user.id) return { error: await tStudio('errForbidden') };
  if (!adminUser && !CREATOR_EDITABLE_STATUSES.has(existing.status)) {
    return { error: await tStudio('errPublishedTagsLocked') };
  }
  if (!adminUser) {
    const profile = await getProfileFlags(user.id);
    if (!profile?.is_content_creator) return { error: await tStudio('errNoCreatorPermission') };
  }

  await admin.from('post_tags').delete().eq('post_id', postId);
  if (tagIds.length > 0) {
    const { error: insertError } = await admin
      .from('post_tags')
      .insert(tagIds.map((tagId) => ({ post_id: postId, tag_id: tagId })));
    if (insertError) {
      logger.error('assignCreatorPostTags', insertError);
      return { error: await tStudio('errTagsSaveFailed') };
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
  if (!isAdminUser(user)) return { error: await tStudio('errForbidden') };

  const id = String(formData.get('id') || '').trim();
  const decision = String(formData.get('decision') || '').trim(); // publish | reject
  const note = String(formData.get('review_note') || '')
    .trim()
    .slice(0, 1000);
  if (!id) return { error: await tStudio('errPostNotFound') };
  if (!['publish', 'reject'].includes(decision))
    return { error: await tStudio('errInvalidDecision') };

  const admin = createAdminClient();
  const { data: existing, error: loadError } = await admin
    .from('posts')
    .select('id, status, slug, published_at, author_id, title')
    .eq('id', id)
    .maybeSingle();
  if (loadError || !existing) return { error: await tStudio('errPostNotFound') };

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
    return { error: await tStudio('errReviewSaveFailed') };
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
          ? await tStudio('notifyPostPublished', { title: existing.title })
          : note
            ? await tStudio('notifyPostRejectedWithNote', { title: existing.title, note })
            : await tStudio('notifyPostRejected', { title: existing.title });
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
            subject: published
              ? await tStudio('emailSubjectPostPublished')
              : await tStudio('emailSubjectPostUpdate'),
            html: contentEmailHtml({
              title: published
                ? await tStudio('emailTitlePostPublished')
                : await tStudio('emailTitleReviewResult'),
              body: message,
              ctaLabel: published
                ? await tStudio('emailCtaReadPost')
                : await tStudio('emailCtaBackStudio'),
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
    success:
      decision === 'publish'
        ? await tStudio('successPostPublished')
        : await tStudio('successPostRejected'),
  };
}

/**
 * Upload a cover/featured image for a creator post (or admin).
 * Returns a public GCS URL for use as featured_image_url.
 */
export async function uploadCreatorCoverImage(formData) {
  const { user, error } = await requireUser();
  if (error) return { error };
  if (!isAdminUser(user)) {
    const profile = await getProfileFlags(user.id);
    if (!profile?.is_content_creator) {
      return { error: await tStudio('errNoCreatorPermission') };
    }
  }

  const file = formData?.get?.('image');
  if (!file || typeof file !== 'object' || !file.size) {
    return { error: await tStudio('errCoverMissing') };
  }
  if (file.size > MAX_COVER_BYTES) {
    return { error: await tStudio('errCoverTooLarge') };
  }
  const mime = String(file.type || '').toLowerCase();
  if (mime && !ALLOWED_COVER_TYPES.has(mime)) {
    return { error: await tStudio('errCoverType') };
  }

  const originalName = String(file.name || 'cover.jpg');
  const ext = (originalName.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
  const gcsPath = `blog-images/creators/${user.id}/${Date.now()}.${safeExt}`;

  try {
    const publicUrl = await uploadToGCS(gcsPath, file, mime || 'image/jpeg');
    return { success: true, url: publicUrl };
  } catch (uploadError) {
    logger.error('uploadCreatorCoverImage', uploadError);
    return { error: await tStudio('errCoverUpload') };
  }
}

export async function getCreatorPostsForCurrentUser() {
  const { user, error } = await requireUser();
  if (error || !user) return [];
  const admin = createAdminClient();
  const { data, error: qError } = await admin
    .from('posts')
    .select(
      'id, title, slug, status, type, updated_at, submitted_at, published_at, review_note, featured_image_url'
    )
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
