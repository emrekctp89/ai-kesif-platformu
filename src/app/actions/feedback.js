'use server';

import logger from '@/utils/logger';

import { createClient } from '@/utils/supabase/actions';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { ContactFormEmail } from '@/components/emails/ContactFormEmail';
import { enforceRateLimit, validateHumanForm } from '@/utils/antiAbuse';

// Basit bir e-posta şablonu
const FeedbackEmail = ({ feedback, userEmail, feedbackType }) => (
  <div>
    <h1>Yeni Geri Bildirim Alındı</h1>
    <p>
      <strong>Gönderen:</strong> {userEmail || 'Misafir Kullanıcı'}
    </p>
    <p>
      <strong>Tür:</strong> {feedbackType}
    </p>
    <hr />
    <h2>Mesaj:</h2>
    <p style={{ whiteSpace: 'pre-wrap' }}>{feedback}</p>
  </div>
);

export async function sendFeedback(formData) {
  'use server';

  const humanCheck = validateHumanForm(formData);
  if (!humanCheck.valid) return { error: humanCheck.error };

  const rateLimit = await enforceRateLimit('feedback', {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return {
      error: `Çok fazla geri bildirim gönderdiniz. Yaklaşık ${Math.ceil(
        rateLimit.retryAfterSeconds / 60
      )} dakika sonra tekrar deneyin.`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const feedback = String(formData.get('feedback') || '').trim();
  const submittedEmail = String(formData.get('email') || '')
    .trim()
    .toLowerCase();
  const feedbackType = String(formData.get('feedback_type') || 'Genel').trim();
  const allowedFeedbackTypes = ['Genel', 'Hata', 'Öneri', 'İçerik'];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const senderEmail = user?.email || submittedEmail;

  if (!feedback) {
    return { error: 'Geri bildirim mesajı boş olamaz.' };
  }

  if (feedback.length < 20 || feedback.length > 2000) {
    return { error: 'Geri bildiriminiz 20 ile 2000 karakter arasında olmalıdır.' };
  }

  if (!senderEmail || !emailPattern.test(senderEmail) || senderEmail.length > 254) {
    return { error: 'Geçerli bir e-posta adresi girin.' };
  }

  if (!allowedFeedbackTypes.includes(feedbackType)) {
    return { error: 'Geçerli bir geri bildirim türü seçin.' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const htmlContent = await render(
      <FeedbackEmail feedback={feedback} userEmail={senderEmail} feedbackType={feedbackType} />
    );

    const { error } = await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: process.env.ADMIN_NOTIF_EMAIL_TO,
      replyTo: senderEmail,
      subject: `AI Keşif Platformu - ${feedbackType} Geri Bildirimi`,
      html: htmlContent,
    });
    if (error) throw error;
  } catch (emailError) {
    logger.error('Geri bildirim gönderme hatası:', emailError);
    return { error: 'Geri bildirim gönderilirken bir hata oluştu.' };
  }

  return { success: 'Geri bildiriminiz için teşekkürler!' };
}

export async function sendContactMessage(formData) {
  'use server';

  const humanCheck = validateHumanForm(formData);
  if (!humanCheck.valid) return { error: humanCheck.error };

  const rateLimit = await enforceRateLimit('contact-message', {
    limit: 4,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return {
      error: `Çok fazla mesaj gönderdiniz. Yaklaşık ${Math.ceil(
        rateLimit.retryAfterSeconds / 60
      )} dakika sonra tekrar deneyin.`,
    };
  }

  const name = String(formData.get('name') || '').trim();
  const senderEmail = String(formData.get('email') || '')
    .trim()
    .toLowerCase();
  const message = String(formData.get('message') || '').trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || !senderEmail || !message) {
    return { error: 'Lütfen tüm alanları doldurun.' };
  }

  if (name.length < 2 || name.length > 100) {
    return { error: 'Adınız 2 ile 100 karakter arasında olmalıdır.' };
  }

  if (!emailPattern.test(senderEmail) || senderEmail.length > 254) {
    return { error: 'Geçerli bir e-posta adresi girin.' };
  }

  if (message.length < 20 || message.length > 2000) {
    return { error: 'Mesajınız 20 ile 2000 karakter arasında olmalıdır.' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: process.env.ADMIN_NOTIF_EMAIL_TO,
      subject: `AI Keşif Platformu - Yeni İletişim Formu Mesajı`,
      replyTo: senderEmail,
      react: ContactFormEmail({
        name,
        senderEmail,
        message,
      }),
    });
    if (error) throw error;
  } catch (error) {
    logger.error('İletişim formu e-postası gönderme hatası:', error);
    return { error: 'Mesajınız gönderilirken bir hata oluştu.' };
  }

  return {
    success: 'Mesajınız için teşekkürler! En kısa sürede size geri döneceğiz.',
  };
}
