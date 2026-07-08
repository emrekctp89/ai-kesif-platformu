export const PROMO_CODES = {
  'FM9R-YXTR': {
    code: 'FM9R-YXTR',
    label: 'Davet Kodu',
    percentOff: 50,
    duration: 'once',
    active: true,
  },
};

export function normalizePromoCode(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toUpperCase();
}

export function getPromoCode(raw) {
  const code = normalizePromoCode(raw);
  if (!code) return null;

  const promo = PROMO_CODES[code];
  if (!promo?.active) return null;

  return promo;
}

export function applyPromoDiscount(amountInCents, promo) {
  if (!promo || !amountInCents) return amountInCents;
  return Math.round(amountInCents * (1 - promo.percentOff / 100));
}

export function toStripeCouponId(code) {
  return `promo_${normalizePromoCode(code).replace(/-/g, '_').toLowerCase()}`;
}
