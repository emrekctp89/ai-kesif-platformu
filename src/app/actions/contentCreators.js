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
import {
  MIN_CREATOR_REPUTATION,
  getCreatorPostTemplate,
  plainTextFromMarkdown,
  validatePostForReview,
} from '@/lib/contentCreatorRules';
import { generateGeminiText } from '@/utils/gemini';
import { enforceRateLimit } from '@/utils/antiAbuse';

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
    .select(
      'is_content_creator, username, email, reputation_points, content_creator_applied_at, content_creator_pitch'
    )
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    logger.error('content creator profile read', error);
    return null;
  }
  return data;
}

/**
 * Best-effort mirror of creator applications into admin_alerts (dashboard legacy queue).
 * Profile columns are the source of truth; alert insert must not block apply.
 */
async function mirrorCreatorApplicationAlert({ userId, email, username, pitch }) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('admin_alerts').insert({
      alert_type: 'content_creator_application',
      description: `İçerik üretici başvurusu: ${username || email || userId} — ${pitch}`,
      link: '/dashboard',
      status: 'Açık',
      metadata: {
        user_id: userId,
        email,
        username,
        pitch,
      },
    });
    if (error) logger.error('mirrorCreatorApplicationAlert', error);
  } catch (err) {
    logger.error('mirrorCreatorApplicationAlert exception', err);
  }
}

async function closeCreatorApplicationAlerts(userId) {
  try {
    const admin = createAdminClient();
    const { data: openAlerts } = await admin
      .from('admin_alerts')
      .select('id, metadata')
      .eq('alert_type', 'content_creator_application')
      .eq('status', 'Açık')
      .limit(50);
    const ids = (openAlerts || [])
      .filter((row) => row?.metadata?.user_id === userId)
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
    // Clear pending application flag whether approved or rejected.
    content_creator_applied_at: null,
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

  await closeCreatorApplicationAlerts(targetId);

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
 * Source of truth: profiles.content_creator_applied_at + content_creator_pitch.
 * admin_alerts is best-effort for the dashboard queue.
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

  // Already pending on profile (source of truth).
  if (profile?.content_creator_applied_at) {
    return {
      success: true,
      message: await tStudio('successApplicationAlreadyPending'),
    };
  }

  const admin = createAdminClient();
  const username = profile?.username || null;
  const email = profile?.email || user.email || null;
  const appliedAt = new Date().toISOString();

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      content_creator_applied_at: appliedAt,
      content_creator_pitch: pitch,
      updated_at: appliedAt,
    })
    .eq('id', user.id);

  if (profileError) {
    logger.error('requestContentCreatorAccess profile', profileError);
    return { error: await tStudio('errApplicationSaveFailed') };
  }

  // Non-blocking dashboard mirror (may fail if alerts table/policy differs).
  await mirrorCreatorApplicationAlert({
    userId: user.id,
    email,
    username,
    pitch,
  });

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
  const profile = await getProfileFlags(userId);
  if (profile?.is_content_creator) return false;
  if (profile?.content_creator_applied_at) return true;

  // Legacy fallback: older applications only stored in admin_alerts.
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('admin_alerts')
      .select('id, metadata, status')
      .eq('alert_type', 'content_creator_application')
      .eq('status', 'Açık')
      .limit(100);
    return (data || []).some((row) => row?.metadata?.user_id === userId);
  } catch {
    return false;
  }
}

export async function getCreatorApplications() {
  const { user, error } = await requireUser();
  if (error || !isAdminUser(user)) return [];
  const admin = createAdminClient();

  // Primary: pending applications on profiles.
  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select(
      'id, username, email, content_creator_pitch, content_creator_applied_at, is_content_creator'
    )
    .eq('is_content_creator', false)
    .not('content_creator_applied_at', 'is', null)
    .order('content_creator_applied_at', { ascending: true });

  if (profileError) {
    logger.error('getCreatorApplications profiles', profileError);
  }

  const fromProfiles = (profiles || []).map((row) => ({
    id: `profile:${row.id}`,
    description: row.content_creator_pitch || '',
    status: 'Açık',
    created_at: row.content_creator_applied_at,
    metadata: {
      user_id: row.id,
      email: row.email || null,
      username: row.username || null,
      pitch: row.content_creator_pitch || '',
    },
  }));

  // Merge any legacy alert-only applications not yet mirrored to profiles.
  let fromAlerts = [];
  try {
    const { data: alerts, error: qError } = await admin
      .from('admin_alerts')
      .select('id, description, metadata, status, created_at')
      .eq('alert_type', 'content_creator_application')
      .eq('status', 'Açık')
      .order('created_at', { ascending: true });
    if (qError) {
      logger.error('getCreatorApplications alerts', qError);
    } else {
      const profileIds = new Set(fromProfiles.map((a) => a.metadata.user_id));
      fromAlerts = (alerts || [])
        .filter((row) => row?.metadata?.user_id && !profileIds.has(row.metadata.user_id))
        .map((row) => ({
          id: `alert:${row.id}`,
          description: row.description,
          metadata: row.metadata,
          status: row.status,
          created_at: row.created_at,
        }));
    }
  } catch (err) {
    logger.error('getCreatorApplications alerts exception', err);
  }

  return [...fromProfiles, ...fromAlerts].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );
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
  const template = getCreatorPostTemplate(formData.get('template_id'));
  const typeRaw = String(formData.get('type') || template.type || 'Yazı').trim() || 'Yazı';
  const type = ['Yazı', 'Rehber'].includes(typeRaw) ? typeRaw : template.type || 'Yazı';
  if (!title) return { error: await tStudio('errTitleRequired') };
  if (!['Yazı', 'Rehber'].includes(type)) return { error: await tStudio('errInvalidType') };

  let seedBody = await tStudio('draftBodySeed', { title });
  let description = '';
  if (template.contentKey) {
    try {
      seedBody = await tStudio(template.contentKey, { title });
    } catch (err) {
      logger.error('createCreatorPost template content', err);
    }
  }
  if (template.descriptionKey) {
    try {
      description = await tStudio(template.descriptionKey, { title });
    } catch (err) {
      logger.error('createCreatorPost template description', err);
    }
  }

  const admin = createAdminClient();
  const slug = `${slugify(title)}-${Date.now().toString(36)}`;
  const { data: newPost, error: insertError } = await admin
    .from('posts')
    .insert({
      title,
      slug,
      author_id: user.id,
      content: seedBody,
      type,
      status: 'Taslak',
      description: String(description || '').slice(0, 500),
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

/**
 * Clone an owned post into a new draft (content, description, type, category, tags, tools).
 * Published originals stay live; the copy starts as Taslak.
 */
export async function duplicateCreatorPost(formData) {
  const { user, error } = await requireUser();
  if (error) return { error };
  if (!isAdminUser(user)) {
    const profile = await getProfileFlags(user.id);
    if (!profile?.is_content_creator) {
      return { error: await tStudio('errNoCreatorPermission') };
    }
  }

  const id = String(formData?.get?.('id') || formData?.id || '').trim();
  if (!id) return { error: await tStudio('errPostNotFound') };

  const admin = createAdminClient();
  const { data: source, error: loadError } = await admin
    .from('posts')
    .select(
      'id, author_id, title, content, description, type, category_id, featured_image_url, status'
    )
    .eq('id', id)
    .maybeSingle();

  if (loadError || !source) return { error: await tStudio('errPostNotFound') };

  const adminUser = isAdminUser(user);
  if (!adminUser && source.author_id !== user.id) {
    return { error: await tStudio('errForbidden') };
  }

  const copySuffix = await tStudio('duplicateTitleSuffix');
  const baseTitle = String(source.title || '').trim() || 'Untitled';
  const title = `${baseTitle}${copySuffix}`.slice(0, 200);
  const slug = `${slugify(title)}-${Date.now().toString(36)}`;

  const { data: newPost, error: insertError } = await admin
    .from('posts')
    .insert({
      title,
      slug,
      author_id: adminUser && source.author_id ? source.author_id : user.id,
      content: source.content || '',
      description: source.description || '',
      type: ['Yazı', 'Rehber'].includes(source.type) ? source.type : 'Yazı',
      status: 'Taslak',
      category_id: source.category_id || null,
      featured_image_url: source.featured_image_url || null,
      review_note: null,
      submitted_at: null,
      published_at: null,
    })
    .select('id')
    .single();

  if (insertError || !newPost) {
    logger.error('duplicateCreatorPost', insertError);
    return { error: await tStudio('errDuplicateFailed') };
  }

  // Best-effort copy of tags + tools.
  try {
    const [{ data: tags }, { data: tools }] = await Promise.all([
      admin.from('post_tags').select('tag_id').eq('post_id', id),
      admin.from('post_tools').select('tool_id').eq('post_id', id),
    ]);
    if (tags?.length) {
      await admin
        .from('post_tags')
        .insert(tags.map((row) => ({ post_id: newPost.id, tag_id: row.tag_id })));
    }
    if (tools?.length) {
      await admin
        .from('post_tools')
        .insert(tools.map((row) => ({ post_id: newPost.id, tool_id: row.tool_id })));
    }
  } catch (copyError) {
    logger.error('duplicateCreatorPost relations', copyError);
  }

  revalidatePath('/icerik');
  revalidatePath('/admin');
  return {
    success: true,
    id: newPost.id,
    message: await tStudio('successDuplicated'),
  };
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

  // Enforce minimum quality only when moving into (or saving as) review.
  if (nextStatus === 'İncelemede') {
    const check = validatePostForReview({
      title: updates.title,
      content: updates.content,
    });
    if (!check.ok) {
      if (check.reason === 'title') {
        return {
          error: await tStudio('errReviewTitleShort', {
            min: check.min,
            current: check.current,
          }),
        };
      }
      return {
        error: await tStudio('errReviewContentShort', {
          min: check.min,
          current: check.current,
        }),
      };
    }
  }

  if (nextStatus === 'İncelemede' && existing.status !== 'İncelemede') {
    updates.submitted_at = new Date().toISOString();
  }

  const isAutosave = String(formData.get('autosave') || '') === '1';

  const { error: updateError } = await admin.from('posts').update(updates).eq('id', id);
  if (updateError) {
    logger.error('updateCreatorPost', updateError);
    return { error: updateError.message || (await tStudio('errSaveFailed')) };
  }

  if (!isAutosave) {
    revalidatePath('/icerik');
    revalidatePath(`/icerik/${id}/edit`);
    revalidatePath('/admin');
    revalidatePath('/blog');
  } else {
    // Lightweight path refresh so list timestamps stay reasonable without thrashing.
    revalidatePath(`/icerik/${id}/edit`);
  }

  return {
    success: isAutosave ? await tStudio('successAutosaved') : await tStudio('successDraftSaved'),
    autosaved: isAutosave,
  };
}

export async function submitCreatorPostForReview(formData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) return { error: await tStudio('errPostNotFound') };

  const payload = new FormData();
  for (const [k, v] of formData.entries()) payload.set(k, v);
  payload.set('status', 'İncelemede');
  payload.delete('autosave');
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

/**
 * Link approved tools to a creator-owned post (post_tools join).
 * Mirrors assignCreatorPostTags auth rules.
 */
export async function assignCreatorPostTools(formData) {
  const { user, error } = await requireUser();
  if (error) return { error };

  const postId = String(formData.get('postId') || formData.get('id') || '').trim();
  if (!postId) return { error: await tStudio('errPostIdMissing') };

  const toolIds = [
    ...new Set(
      formData
        .getAll('toolId')
        .map((id) => parseInt(String(id), 10))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ].slice(0, 20);

  const admin = createAdminClient();
  const { data: existing, error: loadError } = await admin
    .from('posts')
    .select('id, author_id, status, slug')
    .eq('id', postId)
    .maybeSingle();
  if (loadError || !existing) return { error: await tStudio('errPostNotFound') };

  const adminUser = isAdminUser(user);
  if (!adminUser && existing.author_id !== user.id) return { error: await tStudio('errForbidden') };
  if (!adminUser && !CREATOR_EDITABLE_STATUSES.has(existing.status)) {
    return { error: await tStudio('errPublishedToolsLocked') };
  }
  if (!adminUser) {
    const profile = await getProfileFlags(user.id);
    if (!profile?.is_content_creator) return { error: await tStudio('errNoCreatorPermission') };
  }

  // Only link approved tools.
  let validIds = toolIds;
  if (toolIds.length > 0) {
    const { data: approved, error: toolsError } = await admin
      .from('tools')
      .select('id')
      .in('id', toolIds)
      .eq('is_approved', true);
    if (toolsError) {
      logger.error('assignCreatorPostTools tools check', toolsError);
      return { error: await tStudio('errToolsSaveFailed') };
    }
    const approvedSet = new Set((approved || []).map((row) => row.id));
    validIds = toolIds.filter((id) => approvedSet.has(id));
  }

  await admin.from('post_tools').delete().eq('post_id', postId);
  if (validIds.length > 0) {
    const { error: insertError } = await admin
      .from('post_tools')
      .insert(validIds.map((toolId) => ({ post_id: postId, tool_id: toolId })));
    if (insertError) {
      logger.error('assignCreatorPostTools', insertError);
      return { error: await tStudio('errToolsSaveFailed') };
    }
  }

  revalidatePath(`/icerik/${postId}/edit`);
  revalidatePath('/icerik');
  revalidatePath('/blog');
  if (existing.slug) revalidatePath(`/blog/${existing.slug}`);
  return { success: true };
}

export async function adminReviewCreatorPost(formData) {
  const { user, error } = await requireUser();
  if (error) return { error };
  if (!isAdminUser(user)) return { error: await tStudio('errForbidden') };

  const id = String(formData.get('id') || '').trim();
  const decision = String(formData.get('decision') || '').trim(); // publish | reject | return_draft
  const note = String(formData.get('review_note') || '')
    .trim()
    .slice(0, 1000);
  if (!id) return { error: await tStudio('errPostNotFound') };
  if (!['publish', 'reject', 'return_draft'].includes(decision))
    return { error: await tStudio('errInvalidDecision') };

  const admin = createAdminClient();
  const { data: existing, error: loadError } = await admin
    .from('posts')
    .select('id, status, slug, published_at, author_id, title')
    .eq('id', id)
    .maybeSingle();
  if (loadError || !existing) return { error: await tStudio('errPostNotFound') };

  if (
    decision === 'return_draft' &&
    !['İncelemede', 'Yayınlandı', 'Reddedildi'].includes(existing.status)
  ) {
    return { error: await tStudio('errInvalidDecision') };
  }

  const updates = {
    review_note: note || null,
    updated_at: new Date().toISOString(),
  };

  if (decision === 'publish') {
    updates.status = 'Yayınlandı';
    if (!existing.published_at) updates.published_at = new Date().toISOString();
  } else if (decision === 'return_draft') {
    // Pull offline so the creator can edit again in the studio.
    updates.status = 'Taslak';
    updates.published_at = null;
    updates.submitted_at = null;
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
        let message;
        let eventType;
        let link = '/icerik';
        if (decision === 'publish') {
          message = await tStudio('notifyPostPublished', { title: existing.title });
          eventType = 'content_published';
          if (existing.slug) link = `/blog/${existing.slug}`;
        } else if (decision === 'return_draft') {
          message = note
            ? await tStudio('notifyPostReturnedWithNote', { title: existing.title, note })
            : await tStudio('notifyPostReturned', { title: existing.title });
          eventType = 'content_returned_to_draft';
          link = `/icerik/${existing.id}/edit`;
        } else {
          message = note
            ? await tStudio('notifyPostRejectedWithNote', { title: existing.title, note })
            : await tStudio('notifyPostRejected', { title: existing.title });
          eventType = 'content_rejected';
        }
        await admin.from('notifications').insert({
          user_id: existing.author_id,
          event_type: eventType,
          message,
          link,
          is_read: false,
        });
        if (authorProfile.email) {
          await sendContentEventEmail({
            to: authorProfile.email,
            subject:
              decision === 'publish'
                ? await tStudio('emailSubjectPostPublished')
                : await tStudio('emailSubjectPostUpdate'),
            html: contentEmailHtml({
              title:
                decision === 'publish'
                  ? await tStudio('emailTitlePostPublished')
                  : await tStudio('emailTitleReviewResult'),
              body: message,
              ctaLabel:
                decision === 'publish'
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
  revalidatePath('/dashboard');
  revalidatePath('/icerik');
  revalidatePath('/blog');
  if (existing.slug) revalidatePath(`/blog/${existing.slug}`);

  return {
    success:
      decision === 'publish'
        ? await tStudio('successPostPublished')
        : decision === 'return_draft'
          ? await tStudio('successPostReturned')
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
  // Cover and inline body images share the same upload path for creators.
  const kind =
    String(formData?.get?.('kind') || 'cover').toLowerCase() === 'body' ? 'body' : 'cover';
  const gcsPath = `blog-images/creators/${user.id}/${kind}-${Date.now()}.${safeExt}`;

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
  const withViews = await admin
    .from('posts')
    .select(
      'id, title, slug, status, type, updated_at, submitted_at, published_at, review_note, featured_image_url, view_count'
    )
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false });

  if (!withViews.error) return withViews.data || [];

  // Fallback when view_count column is not migrated yet.
  logger.error('getCreatorPostsForCurrentUser', withViews.error);
  const { data, error: qError } = await admin
    .from('posts')
    .select(
      'id, title, slug, status, type, updated_at, submitted_at, published_at, review_note, featured_image_url'
    )
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false });
  if (qError) {
    logger.error('getCreatorPostsForCurrentUser fallback', qError);
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
      'id, title, slug, status, type, description, content, featured_image_url, submitted_at, updated_at, author_id, profiles:author_id(username, email), post_tools(tool_id)'
    )
    .eq('status', 'İncelemede')
    .order('submitted_at', { ascending: true, nullsFirst: false });
  if (qError) {
    // Fallback without embed if FK name differs
    logger.error('getPostsPendingReview', qError);
    const { data: plain } = await admin
      .from('posts')
      .select(
        'id, title, slug, status, type, description, content, featured_image_url, submitted_at, updated_at, author_id'
      )
      .eq('status', 'İncelemede')
      .order('updated_at', { ascending: true });
    return plain || [];
  }
  return data || [];
}

const CREATOR_ASSIST_MODES = new Set(['description', 'outline', 'title', 'improve']);

/**
 * AI writing helper for approved creators (Gemini).
 * Modes: description | outline | title | improve
 * @param {{ mode?: string, title?: string, description?: string, content?: string, locale?: string }} input
 */
export async function assistCreatorPost(input = {}) {
  const { user, error } = await requireUser();
  if (error) return { error };
  if (!isAdminUser(user)) {
    const profile = await getProfileFlags(user.id);
    if (!profile?.is_content_creator) {
      return { error: await tStudio('errNoCreatorPermission') };
    }
  }

  const rateLimit = await enforceRateLimit(`creator-assist:${user.id}`, {
    limit: 12,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return {
      error: await tStudio('errAssistRateLimit', {
        seconds: rateLimit.retryAfterSeconds,
      }),
    };
  }

  const mode = String(input.mode || '').trim();
  if (!CREATOR_ASSIST_MODES.has(mode)) {
    return { error: await tStudio('errAssistMode') };
  }

  const title = String(input.title || '')
    .trim()
    .slice(0, 300);
  const description = String(input.description || '')
    .trim()
    .slice(0, 800);
  const contentPlain = plainTextFromMarkdown(input.content).slice(0, 6000);
  const locale = String(input.locale || 'tr').startsWith('en') ? 'en' : 'tr';

  if (mode === 'title' && title.length < 3 && contentPlain.length < 40) {
    return { error: await tStudio('errAssistNeedContent') };
  }
  if (mode !== 'title' && contentPlain.length < 40 && title.length < 8) {
    return { error: await tStudio('errAssistNeedContent') };
  }

  const langLine =
    locale === 'en' ? 'Write in clear, natural English.' : 'Türkçe, akıcı ve doğal bir dilde yaz.';

  let systemInstruction = `You help content creators on an AI tools discovery platform (AI Keşif). ${langLine}
Return ONLY the requested text — no preamble, no quotes around the whole answer, no markdown fences unless asked for outline headings.`;

  let prompt = '';
  if (mode === 'description') {
    prompt = `Write a short SEO-friendly summary (max 180 characters) for this post.
Title: ${title || '(none)'}
Body excerpt: ${contentPlain || '(empty)'}
Current description: ${description || '(none)'}
Rules: one or two sentences, no hashtags, no clickbait.`;
  } else if (mode === 'title') {
    prompt = `Suggest a clearer, more specific blog/guide title (max 80 characters).
Current title: ${title || '(none)'}
Body excerpt: ${contentPlain || '(empty)'}
Return only the title text.`;
  } else if (mode === 'outline') {
    systemInstruction += ' Use Markdown headings (## and ###) and short bullet points.';
    prompt = `Create a practical outline for this AI tools post/guide.
Title: ${title || '(none)'}
Existing body excerpt: ${contentPlain || '(empty)'}
Include: intro hook, 3–5 main sections, FAQ or tips, short conclusion.
Do not invent fake product claims.`;
  } else {
    // improve
    systemInstruction += ' Keep Markdown structure if present. Improve clarity and flow only.';
    prompt = `Improve this draft for readability without changing the core meaning.
Title: ${title || '(none)'}
Draft:
${String(input.content || '').slice(0, 8000)}

Rules: keep useful structure; fix awkward phrasing; do not add long marketing fluff; output the full improved Markdown body only.`;
  }

  try {
    const raw = await generateGeminiText(prompt, { systemInstruction });
    let text = String(raw || '').trim();
    // Strip accidental wrapping quotes / fences.
    text = text
      .replace(/^```(?:markdown|md)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    if (!text) return { error: await tStudio('errAssistEmpty') };

    if (mode === 'description') text = text.replace(/\s+/g, ' ').slice(0, 280);
    if (mode === 'title') text = text.replace(/^["'“”]+|["'“”]+$/g, '').slice(0, 120);

    return { success: true, mode, text };
  } catch (assistError) {
    logger.error('assistCreatorPost', assistError);
    return { error: await tStudio('errAssistFailed') };
  }
}
