import logger from '@/utils/logger';

/**
 * Best-effort transactional email for content-creator events (Resend).
 * Never throws — failures are logged only.
 *
 * @param {{ to: string, subject: string, html: string }} opts
 */
export async function sendContentEventEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'AI Keşif <onboarding@resend.dev>';
  if (!apiKey || !to) return { sent: false, reason: 'missing_config' };

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });
    return { sent: true };
  } catch (error) {
    logger.error('sendContentEventEmail failed', error);
    return { sent: false, reason: error?.message || 'send_failed' };
  }
}

export function contentEmailHtml({ title, body, ctaLabel, ctaUrl }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://aikesif.com';
  const url = ctaUrl?.startsWith('http') ? ctaUrl : `${site}${ctaUrl || '/'}`;
  return `
    <div style="font-family:sans-serif;padding:20px;max-width:560px;margin:0 auto;color:#111">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      <p style="line-height:1.55;color:#333">${body}</p>
      <p style="margin:24px 0">
        <a href="${url}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">
          ${ctaLabel}
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:12px;color:#777">AI Keşif Platformu</p>
    </div>
  `;
}
