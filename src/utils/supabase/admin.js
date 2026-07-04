import { createClient } from '@supabase/supabase-js';
import process from 'node:process';

// BU İSTEMCİ SADECE GÜVENİLİR SUNUCU ORTAMLARINDA KULLANILMALIDIR!
// Tüm güvenlik kurallarını (RLS) bypass eder.
export const createAdminClient = () => {
  // .env.local dosyasında bu anahtarlardan birinin ayarlı olduğundan emin olmalıyız
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      'KRİTİK HATA: SUPABASE_SERVICE_KEY veya SUPABASE_SERVICE_ROLE_KEY ortam değişkeni ayarlanmamış.'
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
