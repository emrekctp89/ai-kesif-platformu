import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivateIpv4(hostname) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;

  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 169 && b === 254) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname) {
  const normalized = String(hostname || '')
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
  if (normalized === '::1' || normalized === '::') return true;
  const firstHextet = Number.parseInt(normalized.split(':', 1)[0], 16);
  if (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) return true;
  if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) return true;
  if (firstHextet >= 0xff00 && firstHextet <= 0xffff) return true;
  if (normalized.startsWith('2001:db8:')) return true;
  if (normalized.startsWith('::ffff:')) {
    const mappedAddress = normalized.replace('::ffff:', '');
    if (isPrivateIpv4(mappedAddress)) return true;

    const mappedHextets = mappedAddress.split(':');
    if (mappedHextets.length === 2) {
      const high = Number.parseInt(mappedHextets[0], 16);
      const low = Number.parseInt(mappedHextets[1], 16);
      if (
        Number.isInteger(high) &&
        Number.isInteger(low) &&
        high >= 0 &&
        high <= 0xffff &&
        low >= 0 &&
        low <= 0xffff
      ) {
        return isPrivateIpv4(`${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`);
      }
    }
  }
  return false;
}

export function isDisallowedToolIconHost(hostname) {
  const normalized = String(hostname || '').toLowerCase();
  if (!normalized || normalized === 'localhost') return true;
  if (normalized.endsWith('.local') || normalized.endsWith('.localhost')) return true;
  if (net.isIP(normalized) === 6) return isPrivateIpv6(normalized);
  return isPrivateIpv4(normalized) || isPrivateIpv6(normalized);
}

export async function assertSafeToolIconFetchUrl(input) {
  const url = input instanceof URL ? input : new URL(String(input));
  if (!['http:', 'https:'].includes(url.protocol) || isDisallowedToolIconHost(url.hostname)) {
    throw new Error('Unsafe URL');
  }

  const resolvedAddresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (
    resolvedAddresses.some(({ address, family }) =>
      family === 6 ? isPrivateIpv6(address) : isPrivateIpv4(address)
    )
  ) {
    throw new Error('Unsafe resolved address');
  }
  return url;
}
