const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeNewsletterRecipients(subscribers = []) {
  const recipients = subscribers
    .map((subscriber) =>
      String(subscriber?.email || '')
        .trim()
        .toLowerCase()
    )
    .filter((email) => EMAIL_PATTERN.test(email));

  return [...new Set(recipients)];
}
