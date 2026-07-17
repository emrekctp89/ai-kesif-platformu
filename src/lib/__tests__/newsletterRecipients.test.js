import { normalizeNewsletterEmail, normalizeNewsletterRecipients } from '../newsletterRecipients';

describe('normalizeNewsletterEmail', () => {
  it('normalizes a valid email address', () => {
    expect(normalizeNewsletterEmail('  USER@Example.com ')).toBe('user@example.com');
  });

  it('returns an empty string for invalid emails', () => {
    expect(normalizeNewsletterEmail('not-an-email')).toBe('');
    expect(normalizeNewsletterEmail('user@example')).toBe('');
    expect(normalizeNewsletterEmail('')).toBe('');
  });
});

describe('normalizeNewsletterRecipients', () => {
  it('normalizes and deduplicates subscriber emails', () => {
    const recipients = normalizeNewsletterRecipients([
      { email: '  USER@Example.com ' },
      { email: 'user@example.com' },
      { email: 'Second@Example.com' },
    ]);

    expect(recipients).toEqual(['user@example.com', 'second@example.com']);
  });

  it('filters empty and invalid email values', () => {
    const recipients = normalizeNewsletterRecipients([
      { email: '' },
      { email: null },
      {},
      null,
      { email: 'not-an-email' },
      { email: 'valid@example.com' },
    ]);

    expect(recipients).toEqual(['valid@example.com']);
  });

  it('returns an empty list when subscribers are missing', () => {
    expect(normalizeNewsletterRecipients()).toEqual([]);
  });
});
