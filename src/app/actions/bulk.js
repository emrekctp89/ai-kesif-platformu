'use server';

import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import slugify from 'slugify';

export async function bulkImportTools(jsonText) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  // 1. Yetki Kontrolü
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkisiz erişim.' };
  }

  // 2. Parse JSON
  let toolsToImport = [];
  try {
    toolsToImport = JSON.parse(jsonText);
    if (!Array.isArray(toolsToImport)) {
      throw new Error('JSON array olmalıdır.');
    }
  } catch (err) {
    return { error: 'Geçersiz JSON formatı. Lütfen array yapısında geçerli bir JSON girin.' };
  }

  if (toolsToImport.length === 0) {
    return { error: 'Eklenecek araç bulunamadı (Boş liste).' };
  }

  let successCount = 0;
  let errors = [];

  // 3. Her aracı tek tek ekle
  for (let i = 0; i < toolsToImport.length; i++) {
    const rawTool = toolsToImport[i];
    try {
      // Temel zorunlu alanlar
      if (!rawTool.name || !rawTool.website_url) {
        errors.push(`Satır ${i + 1}: İsim ve web sitesi url si zorunludur.`);
        continue;
      }
      if (!rawTool.category_name && !rawTool.category_id) {
        errors.push(`Satır ${i + 1} (${rawTool.name}): category_name veya category_id zorunludur.`);
        continue;
      }

      const baseSlug = slugify(rawTool.name, { lower: true, strict: true, locale: 'tr' });
      // UUID for unique slug
      const slug = `${baseSlug}-${crypto.randomUUID().split('-')[0]}`;

      let finalCategoryId = rawTool.category_id;
      if (!finalCategoryId && rawTool.category_name) {
        // Kategori adını veritabanında ara (büyük/küçük harf duyarsız veya ilike ile yapılabilir)
        // Performans için veritabanına tek tek sorgu atmak yerine yukarıda toplu çekilebilir, ama şimdilik en temizi tek sorgu.
        const { data: catData } = await supabase
          .from('categories')
          .select('id')
          .ilike('name', rawTool.category_name)
          .maybeSingle();

        if (catData) {
          finalCategoryId = catData.id;
        } else {
          // Bulunamadıysa ilk kategoriyi veya 'Diğer' kategorisini alabilirsiniz
          // Burada katı davranıp hata fırlatalım
          errors.push(
            `Satır ${i + 1} (${rawTool.name}): '${rawTool.category_name}' kategorisi bulunamadı.`
          );
          continue;
        }
      }

      // Insert into DB using admin client (bypasses RLS if needed, though admin has rights)
      const { error: insertError } = await supabaseAdmin.from('tools').insert([
        {
          name: rawTool.name,
          slug,
          description: rawTool.description || '',
          link: rawTool.website_url,
          category_id: finalCategoryId,
          is_approved: rawTool.is_approved !== undefined ? rawTool.is_approved : true, // Varsayılan onaylı ekle
          pricing_model: rawTool.pricing_type || 'free',
        },
      ]);

      if (insertError) {
        errors.push(`Satır ${i + 1} (${rawTool.name}): ${insertError.message}`);
      } else {
        successCount++;
      }
    } catch (err) {
      errors.push(
        `Satır ${i + 1} (${rawTool.name || 'Bilinmiyor'}): Beklenmeyen hata - ${err.message}`
      );
    }
  }

  return {
    success: true,
    message: `${successCount} araç başarıyla eklendi.`,
    errors: errors.length > 0 ? errors : null,
  };
}
