import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/utils/antiAbuse';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { applyFunnelStage, isValidFunnelStage, normalizeFunnel } from '@/lib/kasif/funnel';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

const API_MESSAGES = {
  tr: {
    disabled: 'Kâşif etkin değil.',
    rateLimit: 'Çok fazla istek.',
    invalid: 'Geçersiz istek.',
    notFound: 'Etkileşim bulunamadı.',
    failed: 'Funnel kaydedilemedi.',
  },
  en: {
    disabled: 'Kâşif is not enabled.',
    rateLimit: 'Too many requests.',
    invalid: 'Invalid request.',
    notFound: 'Interaction not found.',
    failed: 'Could not save funnel event.',
  },
};

function requestLocale(value) {
  return value === 'en' ? 'en' : 'tr';
}

function parseMinutes(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(Math.round(n), 24 * 60);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: API_MESSAGES.tr.invalid }, { status: 400 });
  }

  const locale = requestLocale(body?.locale);
  const messages = API_MESSAGES[locale];

  try {
    assertKasifEnabled();
  } catch {
    return NextResponse.json({ error: messages.disabled }, { status: 404 });
  }

  const rateLimit = await enforceRateLimit('kasif-funnel', {
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: messages.rateLimit }, { status: 429 });
  }

  const id = String(body?.interactionId || '').trim();
  const token = String(body?.feedbackToken || '').trim();
  const stage = String(body?.stage || '').trim();
  if (!id || !token || !isValidFunnelStage(stage)) {
    return NextResponse.json({ error: messages.invalid }, { status: 400 });
  }

  // Client may only advance from tool_selected onward (seed is server-side).
  const clientAllowed = new Set([
    'tool_selected',
    'setup_started',
    'setup_completed',
    'first_result',
    'job_done',
  ]);
  if (!clientAllowed.has(stage)) {
    return NextResponse.json({ error: messages.invalid }, { status: 400 });
  }

  const minutesToFirstResult = parseMinutes(body?.minutesToFirstResult);
  const selectedTool =
    body?.selectedTool && typeof body.selectedTool === 'object' ? body.selectedTool : null;
  const meta = body?.meta && typeof body.meta === 'object' ? body.meta : null;

  try {
    const admin = createAdminClient();
    const { data: existing, error: readError } = await admin
      .from('kasif_interactions')
      .select('id, funnel')
      .eq('id', id)
      .eq('feedback_token', token)
      .maybeSingle();

    if (readError) throw readError;
    if (!existing) {
      return NextResponse.json({ error: messages.notFound }, { status: 404 });
    }

    const nextFunnel = applyFunnelStage(existing.funnel, stage, {
      selectedTool,
      minutesToFirstResult,
      meta,
    });

    const { data, error: updateError } = await admin
      .from('kasif_interactions')
      .update({ funnel: nextFunnel })
      .eq('id', id)
      .eq('feedback_token', token)
      .select('id, funnel')
      .maybeSingle();

    if (updateError) throw updateError;
    if (!data) {
      return NextResponse.json({ error: messages.notFound }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      funnel: normalizeFunnel(data.funnel),
    });
  } catch (error) {
    logger.error('Kâşif funnel error:', error);
    return NextResponse.json({ error: messages.failed }, { status: 503 });
  }
}
