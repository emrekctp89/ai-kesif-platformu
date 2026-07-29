import { NextResponse } from 'next/server';
import {
  COMPLETION_EVENT_TYPE,
  getCompletionWebhookSecret,
  isSupportedCompletionPartner,
  sha256,
  verifyCompletionSignature,
} from '@/lib/kasif/completionVerification';
import { applyFunnelStage } from '@/lib/kasif/funnel';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

export async function POST(request, context) {
  const { provider: rawProvider } = await context.params;
  const provider = String(rawProvider || '')
    .trim()
    .toLowerCase();
  const secret = isSupportedCompletionPartner(provider)
    ? getCompletionWebhookSecret(provider)
    : null;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook bulunamadı.' }, { status: 404 });
  }

  const rawBody = await request.text();
  const timestamp = request.headers.get('x-kasif-timestamp');
  const signature = request.headers.get('x-kasif-signature');
  if (!verifyCompletionSignature({ secret, timestamp, rawBody, signature })) {
    return NextResponse.json({ error: 'Geçersiz imza.' }, { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Geçersiz payload.' }, { status: 400 });
  }

  const eventId = String(body?.eventId || '')
    .trim()
    .slice(0, 180);
  const eventType = String(body?.eventType || '').trim();
  const claimToken = String(body?.claimToken || '').trim();
  const occurredAt = new Date(body?.occurredAt || Date.now());
  if (
    !eventId ||
    eventType !== COMPLETION_EVENT_TYPE ||
    !claimToken ||
    Number.isNaN(occurredAt.getTime())
  ) {
    return NextResponse.json({ error: 'Geçersiz payload.' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: claim, error: claimError } = await admin
      .from('kasif_completion_claims')
      .select('id, interaction_id, tool_slug, expires_at, used_at')
      .eq('token_hash', sha256(claimToken))
      .eq('tool_slug', provider)
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claim) {
      return NextResponse.json({ error: 'Talep geçersiz veya süresi dolmuş.' }, { status: 410 });
    }

    const { data: interaction, error: interactionError } = await admin
      .from('kasif_interactions')
      .select('id, funnel')
      .eq('id', claim.interaction_id)
      .maybeSingle();
    if (interactionError) throw interactionError;
    if (!interaction) {
      return NextResponse.json({ error: 'Etkileşim bulunamadı.' }, { status: 404 });
    }

    const nextFunnel = applyFunnelStage(interaction.funnel, 'job_done', {
      at: occurredAt.toISOString(),
      selectedTool: { slug: provider },
      meta: {
        verified: true,
        verification: 'partner_webhook',
        provider,
        event_id: eventId,
      },
    });

    const { data: result, error: recordError } = await admin.rpc(
      'record_kasif_verified_completion',
      {
        p_token_hash: sha256(claimToken),
        p_provider: provider,
        p_partner_event_id: eventId,
        p_event_type: eventType,
        p_occurred_at: occurredAt.toISOString(),
        p_payload_hash: sha256(rawBody),
        p_funnel: nextFunnel,
      }
    );
    if (recordError) throw recordError;
    if (result === 'duplicate') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (result !== 'verified') {
      return NextResponse.json({ error: 'Talep geçersiz veya süresi dolmuş.' }, { status: 410 });
    }

    return NextResponse.json({ received: true, verified: true });
  } catch (error) {
    logger.error('Kâşif completion webhook error:', error);
    return NextResponse.json({ error: 'Webhook işlenemedi.' }, { status: 503 });
  }
}
