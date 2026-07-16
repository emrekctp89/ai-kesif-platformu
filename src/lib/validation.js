/**
 * Input Validation Helpers — Sunucu tarafı (Server Action) girdi doğrulama fonksiyonları.
 *
 * Harici kütüphane bağımlılığı yerine saf JavaScript ile yazılmıştır.
 * Server Action'larda kullanıcı girdilerini doğrulamak için kullanılır.
 *
 * Kullanım:
 *   import { validateRequired, validateEmail, validateUrl, validateSlug } from '@/lib/validation';
 */

/**
 * Zorunlu alan kontrolü.
 * @param {*} value
 * @param {string} fieldName — Hata mesajında kullanılacak alan adı
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateRequired(value, fieldName = 'Bu alan') {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { valid: false, error: `${fieldName} zorunludur.` };
  }
  return { valid: true };
}

/**
 * E-posta formatı doğrulama.
 * @param {string} email
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'E-posta adresi zorunludur.' };
  }
  // RFC 5322 simplified
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Geçersiz e-posta formatı.' };
  }
  return { valid: true, value: email.trim().toLowerCase() };
}

/**
 * URL doğrulama.
 * @param {string} url
 * @param {Object} [options]
 * @param {boolean} [options.required=true]
 * @returns {{ valid: boolean, error?: string, value?: string }}
 */
export function validateUrl(url, { required = true } = {}) {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    if (!required) return { valid: true, value: '' };
    return { valid: false, error: 'URL zorunludur.' };
  }
  try {
    const parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL http veya https ile başlamalıdır.' };
    }
    return { valid: true, value: parsed.href };
  } catch {
    return { valid: false, error: 'Geçersiz URL formatı.' };
  }
}

/**
 * Slug doğrulama (küçük harf, tire, rakam).
 * @param {string} slug
 * @returns {{ valid: boolean, error?: string, value?: string }}
 */
export function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Slug zorunludur.' };
  }
  const trimmed = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Slug sadece küçük harf, rakam ve tire içerebilir (örn: yapay-zeka-araci).',
    };
  }
  if (trimmed.length < 2 || trimmed.length > 100) {
    return { valid: false, error: 'Slug 2 ile 100 karakter arasında olmalıdır.' };
  }
  return { valid: true, value: trimmed };
}

/**
 * Metin uzunluğu kontrolü.
 * @param {string} text
 * @param {Object} options
 * @param {string} options.fieldName
 * @param {number} [options.min=1]
 * @param {number} [options.max=5000]
 * @returns {{ valid: boolean, error?: string, value?: string }}
 */
export function validateLength(text, { fieldName = 'Metin', min = 1, max = 5000 } = {}) {
  if (!text || typeof text !== 'string') {
    if (min > 0) return { valid: false, error: `${fieldName} zorunludur.` };
    return { valid: true, value: '' };
  }
  const trimmed = text.trim();
  if (trimmed.length < min) {
    return { valid: false, error: `${fieldName} en az ${min} karakter olmalıdır.` };
  }
  if (trimmed.length > max) {
    return { valid: false, error: `${fieldName} en fazla ${max} karakter olabilir.` };
  }
  return { valid: true, value: trimmed };
}

/**
 * UUID formatı doğrulama.
 * @param {string} id
 * @param {string} [fieldName='ID']
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUUID(id, fieldName = 'ID') {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: `${fieldName} zorunludur.` };
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id.trim())) {
    return { valid: false, error: `Geçersiz ${fieldName} formatı.` };
  }
  return { valid: true, value: id.trim() };
}

/**
 * Sayısal değer doğrulama.
 * @param {*} value
 * @param {Object} options
 * @param {string} [options.fieldName='Sayı']
 * @param {number} [options.min]
 * @param {number} [options.max]
 * @param {boolean} [options.integer=false]
 * @returns {{ valid: boolean, error?: string, value?: number }}
 */
export function validateNumber(value, { fieldName = 'Sayı', min, max, integer = false } = {}) {
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} geçerli bir sayı olmalıdır.` };
  }
  if (integer && !Number.isInteger(num)) {
    return { valid: false, error: `${fieldName} tam sayı olmalıdır.` };
  }
  if (min !== undefined && num < min) {
    return { valid: false, error: `${fieldName} en az ${min} olmalıdır.` };
  }
  if (max !== undefined && num > max) {
    return { valid: false, error: `${fieldName} en fazla ${max} olabilir.` };
  }
  return { valid: true, value: num };
}

/**
 * Birden fazla doğrulamayı zincirleme çalıştırır. İlk hatada durur.
 * @param  {...{valid: boolean, error?: string}} validations
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAll(...validations) {
  for (const v of validations) {
    if (!v.valid) return v;
  }
  return { valid: true };
}
