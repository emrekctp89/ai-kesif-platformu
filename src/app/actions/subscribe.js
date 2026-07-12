'use server';

import { createAdminClient } from '@/utils/supabase/admin';

export async function subscribeToNewsletter(formData) {
  const email = String(formData.get('email') || '')
    .trim()
    .toLowerCase();

  if (!email || !email.includes('@')) {
    return { error: 'Lütfen geçerli bir e-posta adresi girin.' };
  }

  try {
    const supabaseAdmin = createAdminClient();

    // Check if already subscribed
    const { data: existingSubscriber } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email)
      .maybeSingle();

    if (existingSubscriber) {
      if (existingSubscriber.status === 'unsubscribed') {
        // Re-subscribe
        const { error: updateError } = await supabaseAdmin
          .from('newsletter_subscribers')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', existingSubscriber.id);

        if (updateError) throw updateError;
        return { success: true, message: 'Bülten aboneliğiniz yeniden aktifleştirildi!' };
      }
      return { success: true, message: 'Bu e-posta adresi zaten bültenimize kayıtlı.' };
    }

    // Insert new subscriber
    const { error: insertError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert([{ email, source: 'website' }]);

    if (insertError) throw insertError;

    return { success: true, message: 'Bültene başarıyla abone oldunuz! Teşekkürler.' };
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return {
      error: 'Abonelik işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
    };
  }
}
