'use server';

import { createClient } from '@/utils/supabase/server';

export async function subscribeToNewsletter(formData) {
  const email = formData.get('email');

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { error: 'Lütfen geçerli bir e-posta adresi girin.' };
  }

  try {
    const supabase = await createClient();

    // Check if already subscribed
    const { data: existingSubscriber } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email)
      .single();

    if (existingSubscriber) {
      if (existingSubscriber.status === 'unsubscribed') {
        // Re-subscribe
        const { error: updateError } = await supabase
          .from('newsletter_subscribers')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', existingSubscriber.id);

        if (updateError) throw updateError;
        return { success: true, message: 'Bülten aboneliğiniz yeniden aktifleştirildi!' };
      }
      return { success: true, message: 'Bu e-posta adresi zaten bültenimize kayıtlı.' };
    }

    // Insert new subscriber
    const { error: insertError } = await supabase
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
