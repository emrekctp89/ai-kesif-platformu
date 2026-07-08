import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialization moved inside the handler to prevent build-time errors
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // We use the admin client because we need to query without RLS for API keys
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Eksik veya geçersiz Authorization başlığı.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token.startsWith('aik_')) {
      return new Response(JSON.stringify({ error: 'Geçersiz API Anahtarı formatı.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hash the provided token to compare with database
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: apiKey, error: apiKeyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, user_id')
      .eq('key_hash', keyHash)
      .single();

    if (apiKeyError || !apiKey) {
      return new Response(JSON.stringify({ error: 'Geçersiz veya iptal edilmiş API Anahtarı.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update last_used_at in the background (fire and forget)
    supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error('API v1 tools: last_used_at update failed:', updateError);
        }
      })
      .catch((updateError) => {
        console.error('API v1 tools: last_used_at update failed:', updateError);
      });

    // Fetch approved tools
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const page = parseInt(url.searchParams.get('page') || '1', 10);

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const {
      data: tools,
      error: toolsError,
      count,
    } = await supabaseAdmin
      .from('tools')
      .select(
        'id, name, slug, description, website_url, pricing_type, is_verified, created_at, category:categories(name, slug)',
        { count: 'exact' }
      )
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (toolsError) {
      throw toolsError;
    }

    // Flatten category for simpler API response
    const formattedTools = tools.map((tool) => ({
      ...tool,
      category: tool.category?.name || null,
      category_slug: tool.category?.slug || null,
    }));

    return new Response(
      JSON.stringify({
        data: formattedTools,
        meta: {
          total: count,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.ceil(count / safeLimit),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('API v1 tools error:', error);
    return new Response(JSON.stringify({ error: 'Sunucu hatası.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
