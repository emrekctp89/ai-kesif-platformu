import 'server-only';

import logger from '@/utils/logger';
import { createAdminClient } from '@/utils/supabase/admin';

export const KASIF_DEEPSEEK_MODE_KEY = 'kasif_deepseek_superpower';
const CACHE_TTL_MS = 10_000;
let cached = null;
let cachedAt = 0;

function parseModeRow(row) {
  const value = row?.value && typeof row.value === 'object' ? row.value : {};
  return {
    enabled: value.enabled === true,
    updatedAt: row?.updated_at || value.updatedAt || null,
    updatedBy: row?.updated_by || null,
    source: row ? 'app_settings' : 'default',
  };
}

export async function getKasifDeepseekMode(options = {}) {
  const now = Date.now();
  if (!options.forceRefresh && cached && now - cachedAt < CACHE_TTL_MS) return cached;
  const fallback = { enabled: false, updatedAt: null, updatedBy: null, source: 'default' };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('app_settings')
      .select('key, value, updated_at, updated_by')
      .eq('key', KASIF_DEEPSEEK_MODE_KEY)
      .maybeSingle();
    if (error) {
      logger.warn('Kâşif DeepSeek mode read failed; using local mode.', error.message || error);
      cached = fallback;
    } else {
      cached = parseModeRow(data);
    }
  } catch (error) {
    logger.warn('Kâşif DeepSeek mode read error; using local mode.', error?.message || error);
    cached = fallback;
  }
  cachedAt = now;
  return cached;
}

export async function setKasifDeepseekMode(enabled, options = {}) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const payload = {
    key: KASIF_DEEPSEEK_MODE_KEY,
    value: { enabled: enabled === true, updatedAt: now },
    updated_at: now,
    updated_by: options.userId || null,
  };
  const { data, error } = await admin
    .from('app_settings')
    .upsert(payload, { onConflict: 'key' })
    .select('key, value, updated_at, updated_by')
    .single();
  if (error) throw error;
  cached = parseModeRow(data);
  cachedAt = Date.now();
  return cached;
}

export function __resetKasifDeepseekModeCacheForTests() {
  cached = null;
  cachedAt = 0;
}
