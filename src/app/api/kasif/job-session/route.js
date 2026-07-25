import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/utils/antiAbuse';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { understandQuestion } from '@/lib/kasif/engine';
import { applyFunnelStage, seedFunnelFromResponse } from '@/lib/kasif/funnel';
import { assertPackAllowed } from '@/lib/kasif/packAccessServer';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

const API_MESSAGES = {
  tr: {
    disabled: 'Kâşif etkin değil.',
    rateLimit: 'Çok fazla istek.',
    invalid: 'Geçersiz istek.',
    failed: 'Görev oturumu kaydedilemedi.',
    login_required: 'Pro paketler için giriş yap.',
    pro_required: 'Ücretsiz Pro paket kotan doldu. Pro’ya yükselt.',
  },
  en: {
    disabled: 'Kâşif is not enabled.',
    rateLimit: 'Too many requests.',
    invalid: 'Invalid request.',
    failed: 'Could not create job session.',
    login_required: 'Sign in to use Pro packs.',
    pro_required: 'Free Pro pack quota used. Upgrade to Pro.',
  },
};

function requestLocale(value) {
  return value === 'en' ? 'en' : 'tr';
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

  const rateLimit = await enforceRateLimit('kasif-job-session', {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: messages.rateLimit }, { status: 429 });
  }

  const prompt = String(body?.prompt || body?.question || '')
    .trim()
    .slice(0, 800);
  if (prompt.length < 3) {
    return NextResponse.json({ error: messages.invalid }, { status: 400 });
  }

  const stepCount = Math.min(Math.max(Number(body?.stepCount) || 0, 0), 12);
  const clientGoals = Array.isArray(body?.goals)
    ? body.goals
        .map((g) => String(g || '').trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const intent = understandQuestion(prompt);
  const goals = clientGoals.length ? clientGoals : intent.goals || [];
  const source = String(body?.source || 'workmind').slice(0, 40);
  const packId = String(body?.packId || body?.pack || '')
    .trim()
    .slice(0, 80);

  let packUserId = null;
  if (packId) {
    const access = await assertPackAllowed(packId);
    if (!access.allowed) {
      const status = access.reason === 'login_required' ? 401 : 402;
      return NextResponse.json(
        {
          error: messages[access.reason] || messages.failed,
          reason: access.reason,
          freeRunsLeft: access.freeRunsLeft,
          upgradePath: locale === 'en' ? '/en/uyelik' : '/uyelik',
        },
        { status }
      );
    }
    packUserId = access.userId || null;
  }

  const answer =
    locale === 'en'
      ? `Workmind job session started${stepCount ? ` (${stepCount} steps)` : ''}${packId ? ` · pack:${packId}` : ''}.`
      : `Workmind görev oturumu başlatıldı${stepCount ? ` (${stepCount} adım)` : ''}${packId ? ` · paket:${packId}` : ''}.`;

  const modelResponse = {
    intent: {
      goals,
      pricePreference: intent.pricePreference || 'any',
      concepts: intent.concepts || [],
      source,
      ...(packId ? { packId } : {}),
      ...(packUserId ? { userId: packUserId } : {}),
    },
    confidence: goals.length ? 0.75 : 0.55,
    sourceIds: [],
  };
  const groundedResponse = { answer, sources: [], grounded: false };
  let funnel =
    seedFunnelFromResponse(modelResponse, groundedResponse) ||
    applyFunnelStage({}, 'job_stated', {
      meta: { source, goals: goals.slice(0, 4).join(',') },
    });

  const feedbackToken = randomUUID();

  try {
    const admin = createAdminClient();
    const baseRow = {
      feedback_token: feedbackToken,
      question: prompt,
      answer,
      source_ids: [],
      intent: modelResponse.intent,
      confidence: modelResponse.confidence,
    };

    let data = null;
    let error = null;
    ({ data, error } = await admin
      .from('kasif_interactions')
      .insert({ ...baseRow, funnel })
      .select('id')
      .single());

    if (error && funnel) {
      logger.warn('Job session funnel insert failed; retrying without funnel.', error?.message);
      ({ data, error } = await admin
        .from('kasif_interactions')
        .insert(baseRow)
        .select('id')
        .single());
      funnel = null;
    }

    if (error) throw error;

    return NextResponse.json({
      success: true,
      interactionId: data.id,
      feedbackToken,
      goals,
      funnel,
      source,
    });
  } catch (error) {
    logger.error('Kâşif job-session error:', error);
    return NextResponse.json({ error: messages.failed }, { status: 503 });
  }
}
