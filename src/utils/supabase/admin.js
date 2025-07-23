import { createClient } from '@supabase/supabase-js'
import process from "node:process";

// BU İSTEMCİ SADECE GÜVENİLİR SUNUCU ORTAMLARINDA KULLANILMALIDIR!
// Tüm güvenlik kurallarını (RLS) bypass eder.
export const createAdminClient = () => {
  // .env.local dosyasında bu anahtarın ayarlı olduğundan emin olmalıyız
  if (!process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('KRİTİK HATA: SUPABASE_SERVICE_KEY ortam değişkeni ayarlanmamış.');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};
