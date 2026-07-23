import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enforceRateLimit } from '@/utils/antiAbuse';
import logger from '@/utils/logger';

function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

/**
 * POST /api/blog/view
 * Body: { slug: string }
 * Increments posts.view_count for a published slug (best-effort).
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const slug = String(body?.slug || '')
      .trim()
      .slice(0, 200);
    if (!slug || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(slug)) {
      return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
    }

    const rate = await enforceRateLimit(`blog-view:${slug}`, {
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfterSeconds: rate.retryAfterSeconds },
        { status: 429 }
      );
    }

    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc('increment_post_view', { p_slug: slug });
    if (error) {
      // Column/RPC not migrated yet — fail soft so blog remains usable.
      logger.error('increment_post_view', error);
      return NextResponse.json({ ok: false, count: 0 }, { status: 200 });
    }

    return NextResponse.json({ ok: true, count: Number(data) || 0 });
  } catch (err) {
    logger.error('POST /api/blog/view', err);
    return NextResponse.json({ ok: false, count: 0 }, { status: 200 });
  }
}
