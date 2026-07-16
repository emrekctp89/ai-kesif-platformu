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

export function getIntegerParam(searchParams, name) {
  const value = searchParams.get(name);
  if (!value) return undefined;

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function getBooleanParam(searchParams, name, fallback = false) {
  const value = searchParams.get(name);
  if (value === null) return fallback;

  return TRUTHY_VALUES.has(value.toLowerCase());
}
