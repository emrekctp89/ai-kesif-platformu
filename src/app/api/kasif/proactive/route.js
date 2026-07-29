import { NextResponse } from 'next/server';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { rankProactiveSuggestions } from '@/lib/kasif/proactiveRecommendations';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { enforceRateLimit } from '@/utils/antiAbuse';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

async function authenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user || null;
}

export async function GET(request) {
  try {
    assertKasifEnabled();
  } catch {
    return NextResponse.json({ suggestions: [] });
  }

  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ suggestions: [] });
  const locale = new URL(request.url).searchParams.get('locale') === 'en' ? 'en' : 'tr';

  try {
    const admin = createAdminClient();
    const historyStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const toolStart = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: interactions, error: historyError }, { data: tools, error: toolsError }] =
      await Promise.all([
        admin
          .from('kasif_interactions')
          .select('id, question, source_ids, intent, funnel, created_at')
          .eq('user_id', user.id)
          .gte('created_at', historyStart)
          .order('created_at', { ascending: false })
          .limit(50),
        admin
          .from('tools')
          .select('id, name, slug, link, description, created_at')
          .eq('is_approved', true)
          .gte('created_at', toolStart)
          .order('created_at', { ascending: false })
          .limit(300),
      ]);
    if (historyError) throw historyError;
    if (toolsError) throw toolsError;

    const ranked = rankProactiveSuggestions(interactions, tools, { locale, limit: 6 });
    if (!ranked.length) return NextResponse.json({ suggestions: [] });

    const keys = ranked.map((item) => item.suggestionKey);
    const { data: dismissed, error: dismissedError } = await admin
      .from('kasif_proactive_events')
      .select('suggestion_key')
      .eq('user_id', user.id)
      .eq('event_type', 'dismissed')
      .in('suggestion_key', keys);
    if (dismissedError) throw dismissedError;
    const dismissedKeys = new Set((dismissed || []).map((item) => item.suggestion_key));
    return NextResponse.json({
      suggestions: ranked.filter((item) => !dismissedKeys.has(item.suggestionKey)).slice(0, 3),
    });
  } catch (error) {
    logger.warn('Kâşif proactive suggestions unavailable.', error?.message);
    return NextResponse.json({ suggestions: [] });
  }
}

export async function POST(request) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const limited = await enforceRateLimit('kasif-proactive-event', {
    limit: 120,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const suggestionKey = String(body?.suggestionKey || '')
    .trim()
    .slice(0, 220);
  const toolSlug = String(body?.toolSlug || '')
    .trim()
    .slice(0, 120);
  const interactionId = String(body?.interactionId || '').trim() || null;
  const eventType = ['shown', 'clicked', 'dismissed'].includes(body?.eventType)
    ? body.eventType
    : null;
  if (
    !suggestionKey ||
    !toolSlug ||
    !eventType ||
    !interactionId ||
    suggestionKey !== `${interactionId}:${toolSlug}`
  ) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: ownedInteraction, error: ownershipError } = await admin
      .from('kasif_interactions')
      .select('id')
      .eq('id', interactionId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (ownershipError) throw ownershipError;
    if (!ownedInteraction) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const { error } = await admin.from('kasif_proactive_events').upsert(
      {
        user_id: user.id,
        suggestion_key: suggestionKey,
        event_type: eventType,
        tool_slug: toolSlug,
        context_interaction_id: interactionId,
      },
      { onConflict: 'user_id,suggestion_key,event_type', ignoreDuplicates: true }
    );
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.warn('Kâşif proactive event unavailable.', error?.message);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
