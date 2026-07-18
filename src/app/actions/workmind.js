'use server';

import { createClient } from '@/utils/supabase/server';

export async function getToolsByCategorySlug(categorySlug) {
  const supabase = await createClient();

  // Önce kategori slug'ından category id'yi bulalım
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .single();

  if (!category) return [];

  // O kategoriye ait popüler/onaylı araçları getirelim
  const { data: tools, error } = await supabase
    .from('tools')
    .select('id, name, slug, description, image_url, tier')
    .eq('category_id', category.id)
    .eq('is_approved', true)
    .order('tier', { ascending: false }) // Sponsorlu/Pro üstte
    .limit(3);

  if (error) {
    console.error('Workmind tools fetch error:', error);
    return [];
  }

  return tools;
}

export async function saveWorkflow(prompt, nodes, edges, isPublic = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Giriş yapmanız gerekiyor.' };
  }

  const { data, error } = await supabase
    .from('workflows')
    .insert({
      user_id: user.id,
      prompt,
      nodes,
      edges,
      is_public: isPublic,
    })
    .select()
    .single();

  if (error) {
    console.error('Save workflow error:', error);
    return { error: 'İş akışı kaydedilemedi.' };
  }

  return { success: true, data };
}
