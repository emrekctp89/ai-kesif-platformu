import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/utils/antiAbuse';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { applyFunnelStage, normalizeFunnel } from '@/lib/kasif/funnel';
import { estimateMinutesFromFunnel, validateBridgeArtifact } from '@/lib/kasif/resultBridge';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

const API_MESSAGES = {
  tr: {
    disabled: 'Kâşif etkin değil.',
    rateLimit: 'Çok fazla istek.',
    invalid: 'Geçersiz istek.',
    notFound: 'Etkileşim bulunamadı.',
    empty: 'Yapıştırılan metin boş.',
    too_short: 'Metin çok kısa — ilk çıktıyı daha eksiksiz yapıştır.',
    too_long: 'Metin çok uzun (limit aşıldı).',
    weak_structure: 'İçerik taslağı gibi görünmüyor; başlık veya paragraflı metin dene.',
    unsupported_goal: 'Bu görev tipi için yapıştırma köprüsü yok.',
    failed: 'Sonuç kaydedilemedi.',
  },
  en: {
    disabled: 'Kâşif is not enabled.',
    rateLimit: 'Too many requests.',
    invalid: 'Invalid request.',
    notFound: 'Interaction not found.',
    empty: 'Pasted text is empty.',
    too_short: 'Text is too short — paste a fuller first output.',
    too_long: 'Text is too long (limit exceeded).',
    weak_structure: 'Does not look like a draft — try headings or paragraph structure.',
    unsupported_goal: 'Paste bridge is not available for this goal.',
    failed: 'Could not save result.',
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

  const rateLimit = await enforceRateLimit('kasif-result-bridge', {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: messages.rateLimit }, { status: 429 });
  }

  const id = String(body?.interactionId || '').trim();
  const token = String(body?.feedbackToken || '').trim();
  const goal = String(body?.goal || '').trim();
  const text = String(body?.text || '');
  const markJobDone = body?.markJobDone === true;

  if (!id || !token || !goal) {
    return NextResponse.json({ error: messages.invalid }, { status: 400 });
  }

  const validation = validateBridgeArtifact(goal, text);
  if (!validation.ok) {
    const errorKey = validation.reason || 'invalid';
    return NextResponse.json(
      {
        error: messages[errorKey] || messages.invalid,
        reason: validation.reason,
        charCount: validation.charCount ?? 0,
      },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const { data: existing, error: readError } = await admin
      .from('kasif_interactions')
      .select('id, funnel, intent')
      .eq('id', id)
      .eq('feedback_token', token)
      .maybeSingle();

    if (readError) throw readError;
    if (!existing) {
      return NextResponse.json({ error: messages.notFound }, { status: 404 });
    }

    const minutes =
      parseMinutes(body?.minutesToFirstResult) ?? estimateMinutesFromFunnel(existing.funnel, 15);

    const artifactMeta = {
      bridge: 'paste',
      goal: validation.goal,
      char_count: validation.charCount,
      fingerprint: validation.fingerprint,
      pattern_hit: Boolean(validation.patternHit),
      preview: validation.preview,
    };

    let nextFunnel = applyFunnelStage(existing.funnel, 'first_result', {
      minutesToFirstResult: minutes,
      meta: artifactMeta,
    });

    // Store a compact artifact summary on the funnel object (not full body).
    nextFunnel = {
      ...normalizeFunnel(nextFunnel),
      result_artifact: {
        goal: validation.goal,
        char_count: validation.charCount,
        fingerprint: validation.fingerprint,
        pattern_hit: Boolean(validation.patternHit),
        preview: validation.preview,
        bridge: 'paste',
        at: new Date().toISOString(),
      },
    };

    if (markJobDone) {
      nextFunnel = applyFunnelStage(nextFunnel, 'job_done', {
        meta: { self_report: true, via: 'result_bridge' },
      });
    }

    // Merge goal into intent if missing (analytics).
    const intent =
      existing.intent && typeof existing.intent === 'object' ? { ...existing.intent } : {};
    const goals = Array.isArray(intent.goals) ? [...intent.goals] : [];
    if (validation.goal && !goals.includes(validation.goal)) {
      goals.unshift(validation.goal);
      intent.goals = goals.slice(0, 6);
    }

    const { data, error: updateError } = await admin
      .from('kasif_interactions')
      .update({
        funnel: nextFunnel,
        intent,
      })
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
      artifact: nextFunnel.result_artifact,
      minutesToFirstResult: minutes,
      jobDone: markJobDone,
    });
  } catch (error) {
    logger.error('Kâşif result-bridge error:', error);
    return NextResponse.json({ error: messages.failed }, { status: 503 });
  }
}
