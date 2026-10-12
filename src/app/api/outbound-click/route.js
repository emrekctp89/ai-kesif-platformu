import { NextResponse } from 'next/server';

import { enforceRateLimit } from '@/utils/antiAbuse';
import logger from '@/utils/logger';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

function normalizeDestination(rawUrl) {
  try {
    const url = new URL(String(rawUrl || ''));
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return {
      host: url.hostname.toLowerCase(),
      storedUrl: `${url.origin}${url.pathname}`.slice(0, 1000),
    };
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const rate = await enforceRateLimit('outbound-tool-click', {
      limit: 120,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const toolId = Number(body?.toolId);
    const destination = normalizeDestination(body?.destinationUrl);
    const placement = String(body?.placement || 'unknown')
      .trim()
      .slice(0, 80);
    const referrerPath = String(body?.referrerPath || '')
      .trim()
      .slice(0, 300);
    const locale = String(body?.locale || '')
      .trim()
      .slice(0, 12);

    if (!Number.isSafeInteger(toolId) || toolId <= 0 || !destination || !placement) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: tool, error: toolError } = await admin
      .from('tools')
      .select('id, link')
      .eq('id', toolId)
      .eq('is_approved', true)
      .maybeSingle();

    const approvedDestination = normalizeDestination(tool?.link);
    if (
      toolError ||
      !tool ||
      !approvedDestination ||
      approvedDestination.host !== destination.host
    ) {
      return NextResponse.json({ error: 'tool_not_found' }, { status: 404 });
    }

    let userId = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // Anonymous clicks are expected and remain useful aggregate data.
    }

    const { error } = await admin.from('tool_outbound_clicks').insert({
      tool_id: toolId,
      user_id: userId,
      destination_url: destination.storedUrl,
      placement,
      referrer_path: referrerPath.startsWith('/') ? referrerPath : null,
      locale: /^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale) ? locale : null,
    });

    if (error) {
      logger.error('[outbound-click] insert failed:', error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    logger.error('[outbound-click] unexpected failure:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
