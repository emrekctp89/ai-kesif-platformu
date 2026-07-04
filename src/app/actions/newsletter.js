'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { Resend } from 'resend';
import { WeeklyNewsletterEmail } from '@/components/emails/WeeklyNewsletterEmail';
import { render } from '@react-email/render';

export async function previewNewsletter() {
  'use server';

  try {
    const supabaseAdmin = createAdminClient();

    const { data: newsletterData, error } = await supabaseAdmin.rpc('get_weekly_newsletter_data');

    if (error || !newsletterData) {
      console.error('Bülten verisi çekilirken hata:', error);
      return {
        error: 'Bülten verisi oluşturulurken bir veritabanı hatası oluştu.',
      };
    }

    return { success: true, data: newsletterData };
  } catch (e) {
    console.error('previewNewsletter hatası:', e);
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

  const { data: users, error: userError } = await supabaseAdmin.from('profiles').select('email');

  if (userError || !users || users.length === 0) {
    return { error: 'Gönderilecek kullanıcı bulunamadı.' };
  }
  const recipients = users.map((u) => u.email);

  try {
    await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: recipients,
      subject: 'AI Keşif Platformu | Haftalık Bülten',
      html: htmlContent,
    });
  } catch (emailError) {
    console.error('Bülten gönderme hatası:', emailError);
    return { error: 'Bülten gönderilirken bir hata oluştu.' };
  }

  return {
    success: `${recipients.length} kullanıcıya bülten başarıyla gönderildi.`,
  };
}
