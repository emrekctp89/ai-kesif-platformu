import logger from '@/utils/logger';
('use server');

import { createAdminClient } from '@/utils/supabase/admin';
import { Resend } from 'resend';
import { WeeklyNewsletterEmail } from '@/components/emails/WeeklyNewsletterEmail';
import { render } from '@react-email/render';
import { slugify } from '@/utils/slugify';
import { normalizeNewsletterRecipients } from '@/lib/newsletterRecipients';

const NEWSLETTER_SUBJECT = 'AI Keşif Platformu | Haftalık Bülten';

function buildNewsletterTitle(sentAt = new Date()) {
  const dateLabel = sentAt.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return `Haftalık Bülten — ${dateLabel}`;
}

function buildNewsletterDescription(newsletterData) {
  const highlights = [];

  if (newsletterData?.trending_tools?.length) {
    const names = newsletterData.trending_tools
      .slice(0, 3)
      .map((tool) => tool.name)
      .filter(Boolean);
    if (names.length) {
      highlights.push(`Trend araçlar: ${names.join(', ')}`);
    }
  }

  if (newsletterData?.top_prompt?.title) {
    highlights.push(`Haftanın prompt'u: ${newsletterData.top_prompt.title}`);
  }

  if (newsletterData?.latest_post?.title) {
    highlights.push(`Son yazı: ${newsletterData.latest_post.title}`);
  }

  if (highlights.length > 0) {
    return highlights.join(' · ');
  }

  return 'AI Keşif Platformu haftalık bülteni: trend araçlar, promptlar ve topluluk öne çıkanları.';
}

async function createUniqueNewsletterSlug(supabaseAdmin, baseTitle) {
  const datePart = new Date().toISOString().slice(0, 10);
  const baseSlug = slugify(`${baseTitle}-${datePart}`) || `haftalik-bulten-${datePart}`;

  let candidate = baseSlug;
  let attempt = 1;

  while (attempt < 20) {
    const { data, error } = await supabaseAdmin
      .from('newsletters')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) {
      logger.error('Bülten slug kontrolü hatası:', error);
      // Fail open with a timestamp suffix so archive insert can still proceed
      return `${baseSlug}-${Date.now()}`;
    }

    if (!data) {
      return candidate;
    }

    attempt += 1;
    candidate = `${baseSlug}-${attempt}`;
  }

  return `${baseSlug}-${Date.now()}`;
}

async function archiveSentNewsletter({ supabaseAdmin, newsletterData, htmlContent, subject }) {
  const sentAt = new Date();
  const title = buildNewsletterTitle(sentAt);
  const slug = await createUniqueNewsletterSlug(supabaseAdmin, 'haftalik-bulten');
  const description = buildNewsletterDescription(newsletterData);

  const { data, error } = await supabaseAdmin
    .from('newsletters')
    .insert({
      slug,
      title,
      subject,
      description,
      html_content: htmlContent,
      content_json: newsletterData ?? {},
      sent_at: sentAt.toISOString(),
    })
    .select('slug')
    .single();

  if (error) {
    logger.error('Bülten arşive kaydedilirken hata:', error);
    return { error: 'Bülten gönderildi ancak web arşivine kaydedilemedi.' };
  }

  return { success: true, slug: data.slug };
}

export async function previewNewsletter() {
  'use server';

  try {
    const supabaseAdmin = createAdminClient();

    const { data: newsletterData, error } = await supabaseAdmin.rpc('get_weekly_newsletter_data');

    if (error || !newsletterData) {
      logger.error('Bülten verisi çekilirken hata:', error);
      return {
        error: 'Bülten verisi oluşturulurken bir veritabanı hatası oluştu.',
      };
    }

    const html = await render(<WeeklyNewsletterEmail newsletterData={newsletterData} />);

    return { success: true, data: newsletterData, html };
  } catch (e) {
    logger.error('previewNewsletter hatası:', e);
    return { error: 'Önizleme verisi alınırken beklenmedik bir hata oluştu.' };
  }
}

export async function sendNewsletter() {
  'use server';

  if (!process.env.SUPABASE_SERVICE_KEY || !process.env.RESEND_API_KEY) {
    return { error: 'Gerekli API anahtarları yapılandırılmamış.' };
  }

  const supabaseAdmin = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: newsletterData, error: dataError } = await supabaseAdmin.rpc(
    'get_weekly_newsletter_data'
  );
  if (dataError || !newsletterData) {
    return { error: 'Bülten içeriği oluşturulamadı.' };
  }

  const htmlContent = await render(<WeeklyNewsletterEmail newsletterData={newsletterData} />);

  const { data: subscribers, error: subscriberError } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('email')
    .eq('status', 'active');

  if (subscriberError || !subscribers || subscribers.length === 0) {
    return { error: 'Gönderilecek aktif bülten abonesi bulunamadı.' };
  }
  const recipients = normalizeNewsletterRecipients(subscribers);

  if (recipients.length === 0) {
    return { error: 'Gönderilecek geçerli e-posta adresi bulunamadı.' };
  }

  try {
    await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: recipients,
      subject: NEWSLETTER_SUBJECT,
      html: htmlContent,
    });
  } catch (emailError) {
    logger.error('Bülten gönderme hatası:', emailError);
    return { error: 'Bülten gönderilirken bir hata oluştu.' };
  }

  const archiveResult = await archiveSentNewsletter({
    supabaseAdmin,
    newsletterData,
    htmlContent,
    subject: NEWSLETTER_SUBJECT,
  });

  if (archiveResult.error) {
    return {
      success: `${recipients.length} kullanıcıya bülten gönderildi. ${archiveResult.error}`,
      archiveError: true,
    };
  }

  return {
    success: `${recipients.length} kullanıcıya bülten başarıyla gönderildi ve arşive eklendi.`,
    slug: archiveResult.slug,
  };
}
