/**
 * Shared Bearer API-key auth for public developer endpoints (`/api/v1/*`).
 * Keys are stored hashed (sha256); raw keys are never persisted.
 */

import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';

export const API_KEY_PREFIX = 'aik_';

/**
 * @param {string|null|undefined} authorizationHeader
 * @returns {{ token: string } | { error: string, status: number }}
 */
export function extractBearerToken(authorizationHeader) {
  const header = String(authorizationHeader || '').trim();
  if (!header) {
    return { error: 'Missing or invalid Authorization header.', status: 401 };
  }
  if (!header.toLowerCase().startsWith('bearer ')) {
    return { error: 'Missing or invalid Authorization header.', status: 401 };
  }
  const token = header.slice(7).trim();
  if (!token) {
    return { error: 'Missing or invalid Authorization header.', status: 401 };
  }
  if (!token.startsWith(API_KEY_PREFIX)) {
    return { error: 'Invalid API key format.', status: 401 };
  }
  return { token };
}

/**
 * @param {string} rawKey
 * @returns {string}
 */
export function hashApiKey(rawKey) {
  return crypto.createHash('sha256').update(String(rawKey || '')).digest('hex');
}

/**
 * Authenticate a Request (or NextRequest) with `Authorization: Bearer aik_…`.
 * Touch-updates `last_used_at` in the background on success.
 *
 * @param {Request} request
 * @returns {Promise<
 *   | { ok: true, apiKeyId: string, userId: string }
 *   | { ok: false, error: string, status: number }
 * >}
 */
export async function authenticateDeveloperRequest(request) {
  const extracted = extractBearerToken(request?.headers?.get?.('authorization'));
  if ('error' in extracted) {
    return { ok: false, error: extracted.error, status: extracted.status };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const keyHash = hashApiKey(extracted.token);

    const { data: apiKey, error: apiKeyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, user_id')
      .eq('key_hash', keyHash)
      .maybeSingle();

    if (apiKeyError || !apiKey?.id) {
      return { ok: false, error: 'Invalid or revoked API key.', status: 401 };
    }

    // Fire-and-forget usage stamp
    Promise.resolve(
      supabaseAdmin
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKey.id)
    )
      .then((result) => {
        if (result?.error) {
          logger.error('API key last_used_at update failed:', result.error);
        }
      })
      .catch((err) => {
        logger.error('API key last_used_at update failed:', err);
      });

    return {
      ok: true,
      apiKeyId: String(apiKey.id),
      userId: String(apiKey.user_id),
    };
  } catch (err) {
    logger.error('authenticateDeveloperRequest failed:', err);
    return { ok: false, error: 'Server error while validating API key.', status: 500 };
  }
}
