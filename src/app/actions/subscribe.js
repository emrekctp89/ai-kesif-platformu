import logger from '@/utils/logger';
('use server');

import { createAdminClient } from '@/utils/supabase/admin';
import { normalizeNewsletterEmail } from '@/lib/newsletterRecipients';

export async function subscribeToNewsletter(formData) {
  const email = normalizeNewsletterEmail(formData.get('email'));

  if (!email) {
    return { error: 'Lütfen geçerli bir e-posta adresi girin.' };
  }

  try {
    const supabaseAdmin = createAdminClient();

    const { data: existingSubscriber } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email)
      .maybeSingle();

    if (existingSubscriber) {
      if (existingSubscriber.status === 'unsubscribed') {
        const { error: updateError } = await supabaseAdmin
          .from('newsletter_subscribers')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', existingSubscriber.id);

        if (updateError) throw updateError;
        return { success: true, message: 'Bülten aboneliğiniz yeniden aktifleştirildi!' };
      }
      return { success: true, message: 'Bu e-posta adresi zaten bültenimize kayıtlı.' };
    }

    const { error: insertError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert([{ email, source: 'website' }]);

    if (insertError) throw insertError;

    return { success: true, message: 'Bültene başarıyla abone oldunuz! Teşekkürler.' };
  } catch (error) {
    logger.error('Newsletter subscription error:', error);
    return {
      error: 'Abonelik işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
    };
  }
}
