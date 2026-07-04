import 'server-only';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';

const store = globalThis.__aiKesifRateLimits || new Map();
globalThis.__aiKesifRateLimits = store;

function hash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

async function getClientKey(scope) {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip') || 'unknown';

  return `${scope}:${hash(ip)}`;
}

export async function enforceRateLimit(scope, { limit, windowMs }) {
  const key = await getClientKey(scope);
  const now = Date.now();

  if (store.size > 1000) {
    for (const [storedKey, value] of store) {
      if (value.resetAt <= now) store.delete(storedKey);
    }
  }

  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  store.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function validateHumanForm(formData, { minimumMs = 1500 } = {}) {
  const honeypot = String(formData.get('company_website') || '').trim();
  if (honeypot) {
    return { valid: false, error: 'Gönderim doğrulanamadı.' };
  }

  const startedAt = Number(formData.get('started_at'));
  const elapsed = Date.now() - startedAt;

  if (!Number.isFinite(startedAt) || elapsed < minimumMs || elapsed > 2 * 60 * 60 * 1000) {
    return {
      valid: false,
      error: 'Form süresi doğrulanamadı. Lütfen sayfayı yenileyip tekrar deneyin.',
    };
  }

  return { valid: true };
}
