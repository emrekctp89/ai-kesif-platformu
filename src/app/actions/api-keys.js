'use server';

import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

/**
 * Generates a new API key for the current user.
 * Returns the raw key (to be shown once) and stores the hash in the database.
 */
export async function generateApiKey(name) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Yetkisiz erişim.' };
  }

  // Generate a random key
  const rawKey = 'aik_' + crypto.randomBytes(24).toString('base64url');

  // Hash the key for storage
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data, error } = await supabase
    .from('api_keys')
    .insert([
      {
        user_id: user.id,
        name: name || 'Yeni API Anahtarı',
        key_hash: keyHash,
      },
    ])
    .select('id, name, created_at, last_used_at')
    .single();

  if (error) {
    console.error('API key generation error:', error);
    return { error: 'API anahtarı oluşturulamadı.' };
  }

  // Return the raw key along with the DB record
  return { data, rawKey };
}

/**
 * Fetches all API keys for the current user.
 */
export async function getApiKeys() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Yetkisiz erişim.' };
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, created_at, last_used_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch API keys error:', error);
    return { error: 'API anahtarları getirilemedi.' };
  }

  return { data };
}

/**
 * Revokes (deletes) an API key.
 */
export async function revokeApiKey(id) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Yetkisiz erişim.' };
  }

  const { error } = await supabase.from('api_keys').delete().eq('id', id).eq('user_id', user.id);

  if (error) {
    console.error('Revoke API key error:', error);
    return { error: 'API anahtarı silinemedi.' };
  }

  return { success: true };
}
