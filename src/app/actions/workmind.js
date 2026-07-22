'use server';

import logger from '@/utils/logger';

import { cookies } from 'next/headers';

import { resolvePrimarySlug } from '@/lib/categoryTaxonomy';
import { getKasifWorkmindRecommendations } from '@/lib/kasif/integrations';
import { createClient } from '@/utils/supabase/server';
import { enforceRateLimit } from '@/utils/antiAbuse';

function serializeFlowGraph(nodes = [], edges = []) {
  const safeNodes = (Array.isArray(nodes) ? nodes : []).map((node) => {
    const raw = node?.data?.raw || {};
    return {
      id: String(node.id || ''),
      type: node.type || 'default',
      position: node.position || { x: 0, y: 0 },
      data: {
        label: raw.label || node?.data?.labelText || '',
        description: raw.description || '',
        categorySlug: raw.categorySlug || null,
        raw: {
          id: raw.id || node.id,
          label: raw.label || '',
          description: raw.description || '',
          categorySlug: raw.categorySlug || null,
        },
      },
    };
  });

  const safeEdges = (Array.isArray(edges) ? edges : []).map((edge) => ({
    id: String(edge.id || `${edge.source}-${edge.target}`),
    source: String(edge.source || ''),
    target: String(edge.target || ''),
  }));

  return { nodes: safeNodes, edges: safeEdges };
}

export async function getWorkmindToolRecommendations(categorySlug, step = {}) {
  const normalizedStep = {
    goal: String(step?.goal || '')
      .trim()
      .slice(0, 800),
    label: String(step?.label || '')
      .trim()
      .slice(0, 80),
    description: String(step?.description || '')
      .trim()
      .slice(0, 220),
    categorySlug: String(categorySlug || '')
      .trim()
      .slice(0, 80),
  };

  if (normalizedStep.label || normalizedStep.description) {
    const rateLimit = await enforceRateLimit('workmind-kasif', {
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimit.allowed) {
      try {
        const recommendations = await getKasifWorkmindRecommendations(normalizedStep, 4);
        if (recommendations.length) return { tools: recommendations, source: 'kasif' };
      } catch (error) {
        logger.warn('Workmind Kâşif recommendation fallback:', error?.message);
      }
    }
  }

  const tools = await getToolsByCategorySlug(categorySlug);
  return { tools, source: 'category' };
}

export async function getToolsByCategorySlug(categorySlug) {
  const supabase = await createClient(await cookies());
  const primarySlug = resolvePrimarySlug(categorySlug) || String(categorySlug || '').trim();

  if (!primarySlug) return [];

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', primarySlug)
    .maybeSingle();

  if (!category) return [];

  const { data: tools, error } = await supabase
    .from('tools')
    .select('id, name, slug, description, tier, pricing_model, platforms')
    .eq('category_id', category.id)
    .eq('is_approved', true)
    .order('updated_at', { ascending: false })
    .limit(4);

  if (error) {
    logger.error('Workmind tools fetch error:', error);
    return [];
  }

  return tools || [];
}

export async function saveWorkflow(prompt, nodes, edges, isPublic = false) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Giriş yapmanız gerekiyor.' };
  }

  const normalizedPrompt = String(prompt || '').trim();
  if (!normalizedPrompt) {
    return { error: 'Kayıt için bir hedef metni gerekli.' };
  }

  const graph = serializeFlowGraph(nodes, edges);
  if (!graph.nodes.length) {
    return { error: 'Kaydedilecek iş akışı yok.' };
  }

  const { data, error } = await supabase
    .from('workflows')
    .insert({
      user_id: user.id,
      prompt: normalizedPrompt,
      nodes: graph.nodes,
      edges: graph.edges,
      is_public: Boolean(isPublic),
    })
    .select('id')
    .single();

  if (error) {
    logger.error('Save workflow error:', error);
    // Table may not exist yet in some environments
    if (String(error.message || '').includes('workflows') || error.code === '42P01') {
      return {
        error: 'Kayıt altyapısı henüz hazır değil (beta). Migration uygulanınca aktif olacak.',
      };
    }
    return { error: 'İş akışı kaydedilemedi.' };
  }

  return { success: true, data };
}
