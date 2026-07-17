const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function isCronAuthorized(
  request,
  { allowLocalWithoutSecret = true, allowQuerySecret = false } = {}
) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return allowLocalWithoutSecret && process.env.NODE_ENV !== 'production';
  }

  const authorization = request.headers.get('authorization') || '';
  const bearerToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  if (bearerToken === secret) return true;

  if (allowQuerySecret) {
    const secretParam = new URL(request.url).searchParams.get('secret');
    return secretParam === secret;
  }

  return false;
}

export function getIntegerParam(
  searchParams,
  name,
  { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}
) {
  const value = searchParams.get(name);
  if (!value) return undefined;

  const normalized = value.trim();
  if (!/^-?\d+$/.test(normalized)) return undefined;

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isSafeInteger(parsed)) return undefined;

  return Math.min(Math.max(parsed, min), max);
}

export function getBooleanParam(searchParams, name, fallback = false) {
  const value = searchParams.get(name);
  if (value === null) return fallback;

  return TRUTHY_VALUES.has(value.toLowerCase());
}
