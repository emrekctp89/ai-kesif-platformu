import logger from '@/utils/logger';
import 'server-only';

export function normalizePromoCode(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toUpperCase();
}

function parsePromoCodes() {
  const raw = process.env.PROMO_CODES_JSON;
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    logger.error('PROMO_CODES_JSON parse edilemedi:', error);
    return {};
  }
}

export function getPromoCode(raw) {
  const code = normalizePromoCode(raw);
  if (!code) return null;

  const promo = parsePromoCodes()[code];
  if (!promo?.active) return null;

  const percentOff = Number(promo.percentOff);
  if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) return null;

  return {
    code,
    label: promo.label || 'Davet Kodu',
    percentOff,
    duration: promo.duration || 'once',
    active: true,
  };
}

export function toStripeCouponId(code) {
  return `promo_${normalizePromoCode(code).replace(/-/g, '_').toLowerCase()}`;
}
