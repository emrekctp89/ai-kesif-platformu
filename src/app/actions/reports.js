import logger from '@/utils/logger';
('use server');

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { enforceRateLimit, validateHumanForm } from '@/utils/antiAbuse';

const REPORT_REASONS = new Set(['broken', 'redirects_wrong', 'suspicious', 'outdated', 'other']);

const REPORT_STATUSES = new Set(['open', 'reviewing', 'resolved', 'dismissed']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_NOTIFICATION_LINK = '/admin';

function normalizeOptionalEmail(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase();
  if (!email) return null;
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return false;
  return email;
}

async function findAdminUserId(supabaseAdmin) {
  const adminEmail = String(process.env.ADMIN_EMAIL || '')
    .trim()
    .toLowerCase();
  if (!adminEmail) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', adminEmail)
    .maybeSingle();

  if (profile?.id) return profile.id;

  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const adminUser = data?.users?.find(
      (candidate) => String(candidate.email || '').toLowerCase() === adminEmail
    );
    return adminUser?.id || null;
  } catch (error) {
    logger.error("Admin kullanıcı ID'si bulunurken hata:", error);
    return null;
  }
}

async function notifyAdminAboutLinkReport({ reportId, tool, reason, reporterEmail }) {
  const supabaseAdmin = createAdminClient();
  const reasonText =
    {
      broken: 'Site açılmıyor / kırık link',
      redirects_wrong: 'Yanlış siteye yönlendiriyor',
      suspicious: 'Şüpheli veya güvenli görünmüyor',
      outdated: 'Link güncel değil',
      other: 'Diğer',
    }[reason] || reason;

  const message = `${tool.name} için yeni link raporu: ${reasonText}`;
  const metadata = {
    report_id: reportId,
    tool_id: tool.id,
    tool_slug: tool.slug,
    reported_url: tool.link,
    reporter_email: reporterEmail,
  };

  const { error: alertError } = await supabaseAdmin.from('admin_alerts').insert({
    alert_type: 'tool_link_report',
    description: message,
    status: 'Açık',
    link: ADMIN_NOTIFICATION_LINK,
    metadata,
  });

  if (alertError) {
    logger.error('Admin link raporu uyarısı oluşturulamadı:', alertError);
  }

  const adminUserId = await findAdminUserId(supabaseAdmin);
  if (!adminUserId) return;

  const { error: notificationError } = await supabaseAdmin.from('notifications').insert({
    user_id: adminUserId,
    event_type: 'tool_link_report',
    message,
    link: ADMIN_NOTIFICATION_LINK,
    is_read: false,
  });

  if (notificationError) {
    logger.error('Admin link raporu bildirimi oluşturulamadı:', notificationError);
  }
}

export async function submitToolLinkReport(formData) {
  'use server';

  const humanCheck = validateHumanForm(formData);
  if (!humanCheck.valid) return { error: humanCheck.error };

  const rateLimit = await enforceRateLimit('tool-link-report', {
    limit: 4,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return {
      error: `Çok fazla link raporu gönderdiniz. Yaklaşık ${Math.ceil(
        rateLimit.retryAfterSeconds / 60
      )} dakika sonra tekrar deneyin.`,
    };
  }

  const toolId = String(formData.get('toolId') || '').trim();
  const toolSlug = String(formData.get('toolSlug') || '').trim();
  const reportedUrl = String(formData.get('reportedUrl') || '').trim();
  const reason = String(formData.get('reason') || '').trim();
  const details = String(formData.get('details') || '').trim();
  const reporterEmail = normalizeOptionalEmail(formData.get('reporterEmail'));

  if (!toolId || !toolSlug || !reportedUrl || !REPORT_REASONS.has(reason)) {
    return { error: 'Rapor bilgileri eksik veya geçersiz.' };
  }

  if (reporterEmail === false) {
    return {
      error: 'Geçerli bir e-posta adresi girin veya alanı boş bırakın.',
    };
  }

  if (details.length > 1000) {
    return { error: 'Açıklama en fazla 1000 karakter olabilir.' };
  }

  try {
    const parsedUrl = new URL(reportedUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return { error: 'Raporlanan bağlantı geçerli değil.' };
  }

  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tool, error: toolError } = await supabase
    .from('tools')
    .select('id, name, slug, link, is_approved')
    .eq('id', toolId)
    .eq('slug', toolSlug)
    .eq('is_approved', true)
    .maybeSingle();

  if (toolError || !tool) {
    return { error: 'Raporlanacak araç bulunamadı.' };
  }

  const finalReporterEmail = reporterEmail || user?.email || null;
  const { error } = await supabase.from('tool_link_reports').insert({
    tool_id: tool.id,
    reporter_user_id: user?.id || null,
    reporter_email: finalReporterEmail,
    reported_url: reportedUrl,
    reason,
    details: details || null,
  });

  if (error) {
    logger.error('Link raporu kaydedilirken hata:', error);
    return { error: 'Rapor kaydedilirken bir hata oluştu.' };
  }

  try {
    await notifyAdminAboutLinkReport({
      reportId: null,
      tool,
      reason,
      reporterEmail: finalReporterEmail,
    });
  } catch (notificationError) {
    logger.error('Link raporu bildirimi oluşturulurken hata:', notificationError);
  }

  revalidatePath(`/tool/${toolSlug}`);
  revalidatePath('/admin');
  revalidatePath('/', 'layout');

  return { success: 'Link raporunuz alındı. Teşekkürler!' };
}

export async function updateToolLinkReportStatus(formData) {
  'use server';

  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Bu işlem için yetkiniz yok.' };
  }

  const reportId = String(formData.get('reportId') || '').trim();
  const status = String(formData.get('status') || '').trim();
  const adminNote = String(formData.get('adminNote') || '').trim();

  if (!reportId || !REPORT_STATUSES.has(status)) {
    return { error: 'Rapor durumu geçersiz.' };
  }

  if (adminNote.length > 1000) {
    return { error: 'Admin notu en fazla 1000 karakter olabilir.' };
  }

  const now = new Date().toISOString();
  const payload = {
    status,
    admin_note: adminNote || null,
    updated_at: now,
    resolved_at: status === 'resolved' || status === 'dismissed' ? now : null,
  };

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('tool_link_reports')
    .update(payload)
    .eq('id', reportId);

  if (error) {
    logger.error('Link raporu güncellenirken hata:', error);
    return { error: 'Rapor durumu güncellenemedi.' };
  }

  revalidatePath('/admin');
  return { success: 'Rapor durumu güncellendi.' };
}
