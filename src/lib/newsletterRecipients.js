const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeNewsletterEmail(email) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();

  return EMAIL_PATTERN.test(normalized) ? normalized : '';
}

export function normalizeNewsletterRecipients(subscribers = []) {
  const recipients = subscribers
    .map((subscriber) => normalizeNewsletterEmail(subscriber?.email))
    .filter(Boolean);

  return [...new Set(recipients)];
}
