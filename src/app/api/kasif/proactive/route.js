import { NextResponse } from 'next/server';
import { assertKasifEnabled } from '@/lib/kasif/config';
import {
  filterProactiveDelivery,
  PROACTIVE_DELIVERY_POLICY,
  rankProactiveSuggestions,
} from '@/lib/kasif/proactiveRecommendations';
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

function isMissingPreferenceTable(error) {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}

async function readPersonalizationPreference(admin, userId) {
  const { data, error } = await admin
    .from('kasif_proactive_preferences')
    .select('enabled, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error && !isMissingPreferenceTable(error)) throw error;
  return {
    enabled: data?.enabled !== false,
    updatedAt: data?.updated_at || null,
    available: !isMissingPreferenceTable(error),
  };
}

export async function GET(request) {
  try {
    assertKasifEnabled();
  } catch {
    return NextResponse.json({ suggestions: [] });
  }

  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ suggestions: [], personalization: null });
  const locale = new URL(request.url).searchParams.get('locale') === 'en' ? 'en' : 'tr';

  try {
    const admin = createAdminClient();
    const personalization = await readPersonalizationPreference(admin, user.id);
    if (!personalization.enabled) {
      return NextResponse.json({ suggestions: [], personalization });
    }
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

    const ranked = rankProactiveSuggestions(interactions, tools, { locale, limit: 12 });
    if (!ranked.length) {
      return NextResponse.json({ suggestions: [], personalization });
    }

    const keys = ranked.map((item) => item.suggestionKey);
    const cooldownStart = new Date(
      Date.now() - PROACTIVE_DELIVERY_POLICY.toolCooldownDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const [{ data: dismissed, error: dismissedError }, { data: recent, error: recentError }] =
      await Promise.all([
        admin
          .from('kasif_proactive_events')
          .select('suggestion_key, event_type, tool_slug, created_at')
          .eq('user_id', user.id)
          .eq('event_type', 'dismissed')
          .in('suggestion_key', keys),
        admin
          .from('kasif_proactive_events')
          .select('suggestion_key, event_type, tool_slug, created_at')
          .eq('user_id', user.id)
          .eq('event_type', 'shown')
          .gte('created_at', cooldownStart),
      ]);
    if (dismissedError) throw dismissedError;
    if (recentError) throw recentError;
    const filtered = filterProactiveDelivery(ranked, [...(dismissed || []), ...(recent || [])]);
    return NextResponse.json({
      ...filtered,
      personalization,
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
  if (typeof body?.personalizationEnabled === 'boolean') {
    try {
      const admin = createAdminClient();
      const { error } = await admin.from('kasif_proactive_preferences').upsert(
        {
          user_id: user.id,
          enabled: body.personalizationEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      return NextResponse.json({
        success: true,
        personalization: { enabled: body.personalizationEnabled, available: true },
      });
    } catch (error) {
      logger.warn('Kâşif proactive preference unavailable.', error?.message);
      return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
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
        created_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,suggestion_key,event_type',
        // A shown event may be delivered again after cooldown; refresh its
        // timestamp so rolling frequency calculations remain truthful.
        ignoreDuplicates: eventType !== 'shown',
      }
    );
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.warn('Kâşif proactive event unavailable.', error?.message);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
