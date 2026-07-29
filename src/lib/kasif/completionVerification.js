import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const COMPLETION_EVENT_TYPE = 'job.completed';
export const COMPLETION_SIGNATURE_MAX_AGE_SECONDS = 5 * 60;

export const VERIFIED_COMPLETION_PARTNERS = [
  'hoppycopy',
  'adcreative',
  'ahrefs-nsfeya',
  'google-trends-e1d1nu',
  'anyword',
  'copymatic',
  'paragraphai',
  'longshotai',
  'youwrite-ct3syc',
  'optimizely',
  'bloomreach',
  'demandbase',
  'domo',
  'callrail',
  'adext-ai',
];

export function isSupportedCompletionPartner(value) {
  return VERIFIED_COMPLETION_PARTNERS.includes(
    String(value || '')
      .trim()
      .toLowerCase()
  );
}

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function signCompletionPayload(secret, timestamp, rawBody) {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export function verifyCompletionSignature({
  secret,
  timestamp,
  rawBody,
  signature,
  now = Date.now(),
  maxAgeSeconds = COMPLETION_SIGNATURE_MAX_AGE_SECONDS,
}) {
  const seconds = Number(timestamp);
  if (!secret || !Number.isFinite(seconds)) return false;
  if (Math.abs(Math.floor(now / 1000) - seconds) > maxAgeSeconds) return false;

  const actual = String(signature || '').replace(/^sha256=/i, '');
  if (!/^[a-f0-9]{64}$/i.test(actual)) return false;
  const expected = signCompletionPayload(secret, String(timestamp), rawBody);
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

export function getCompletionWebhookSecret(
  provider,
  serialized = process.env.KASIF_PARTNER_WEBHOOK_SECRETS_JSON
) {
  try {
    const secrets = JSON.parse(String(serialized || '{}'));
    const value = secrets?.[provider];
    return typeof value === 'string' && value.length >= 24 ? value : null;
  } catch {
    return null;
  }
}

export function hasVerifiedCompletion(funnel) {
  const events = Array.isArray(funnel?.events) ? funnel.events : [];
  return events.some(
    (event) =>
      event?.stage === 'job_done' &&
      event?.meta?.verified === true &&
      event?.meta?.verification === 'partner_webhook'
  );
}
