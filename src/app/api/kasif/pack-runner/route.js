import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/utils/antiAbuse';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { assertPackAllowed } from '@/lib/kasif/packAccessServer';
import {
  isRunnablePack,
  formatPackArtifact,
  runPack,
  summarizeRunForClient,
} from '@/lib/kasif/packRunner';
import { applyFunnelStage, normalizeFunnel, seedFunnelFromResponse } from '@/lib/kasif/funnel';
import { getJobPackById } from '@/lib/kasif/jobPacks';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

const MESSAGES = {
  tr: {
    disabled: 'Kâşif etkin değil.',
    rateLimit: 'Çok fazla istek.',
    invalid: 'Geçersiz istek.',
    notRunnable: 'Bu paket henüz runner desteklemiyor.',
    login_required: 'Pro paketler için giriş yap.',
    pro_required: 'Ücretsiz Pro paket kotan doldu. Pro’ya yükselt.',
    unknown_pack: 'Paket bulunamadı.',
    failed: 'Paket runner çalıştırılamadı.',
  },
  en: {
    disabled: 'Kâşif is not enabled.',
    rateLimit: 'Too many requests.',
    invalid: 'Invalid request.',
    notRunnable: 'This pack does not support the runner yet.',
    login_required: 'Sign in to use Pro packs.',
    pro_required: 'Free Pro pack quota used. Upgrade to Pro.',
    unknown_pack: 'Pack not found.',
    failed: 'Pack runner failed.',
  },
};

function localeOf(value) {
  return value === 'en' ? 'en' : 'tr';
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: MESSAGES.tr.invalid }, { status: 400 });
  }

  const locale = localeOf(body?.locale);
  const messages = MESSAGES[locale];

  try {
    assertKasifEnabled();
  } catch {
    return NextResponse.json({ error: messages.disabled }, { status: 404 });
  }

  const rateLimit = await enforceRateLimit('kasif-pack-runner', {
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: messages.rateLimit }, { status: 429 });
  }

  const packId = String(body?.packId || '').trim();
  const brief = String(body?.brief || body?.prompt || '')
    .trim()
    .slice(0, 800);

  if (!packId || brief.length < 8) {
    return NextResponse.json({ error: messages.invalid }, { status: 400 });
  }

  if (!isRunnablePack(packId)) {
    return NextResponse.json({ error: messages.notRunnable }, { status: 400 });
  }

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

  try {
    const run = await runPack(packId, brief, locale);
    const artifactText = formatPackArtifact(run, locale);
    const pack = getJobPackById(packId, locale);

    const feedbackToken = randomUUID();
    const intent = {
      goals: pack?.goals || [run.goal].filter(Boolean),
      packId,
      source: 'pack-runner',
      ...(access.userId ? { userId: access.userId } : {}),
    };

    let funnel =
      seedFunnelFromResponse(
        { intent, confidence: 0.85, sourceIds: [] },
        { sources: [{ id: 'runner' }], answer: artifactText }
      ) || applyFunnelStage({}, 'job_stated', { meta: { packId, source: 'pack-runner' } });

    funnel = applyFunnelStage(funnel, 'tool_selected', {
      selectedTool: { id: 'pack-runner', title: 'aikeşif pack runner' },
      meta: { packId, bridge: 'runner' },
    });
    funnel = applyFunnelStage(funnel, 'setup_completed', {
      meta: { packId, action: 'runner' },
    });
    funnel = applyFunnelStage(funnel, 'first_result', {
      minutesToFirstResult: 2,
      meta: {
        bridge: 'runner',
        packId,
        goal: run.goal,
        char_count: artifactText.length,
        runner_source: run.source,
      },
    });
    funnel = {
      ...normalizeFunnel(funnel),
      result_artifact: {
        goal: run.goal,
        char_count: artifactText.length,
        fingerprint: `runner_${packId}_${Date.now()}`,
        pattern_hit: true,
        preview: artifactText.slice(0, 240),
        bridge: 'runner',
        packId,
        runner_source: run.source || 'local',
        at: new Date().toISOString(),
      },
    };

    const admin = createAdminClient();
    const answer =
      locale === 'en' ? `Pack runner finished: ${packId}` : `Paket runner tamamlandı: ${packId}`;

    const { data, error } = await admin
      .from('kasif_interactions')
      .insert({
        feedback_token: feedbackToken,
        question: brief,
        answer,
        source_ids: ['pack-runner'],
        intent,
        confidence: 0.85,
        funnel,
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      packId,
      interactionId: data.id,
      feedbackToken,
      run: summarizeRunForClient(run),
      artifactText,
      funnel: normalizeFunnel(funnel),
      access: {
        reason: access.reason,
        freeRunsLeft: access.freeRunsLeft,
      },
    });
  } catch (error) {
    logger.error('pack-runner error:', error);
    return NextResponse.json({ error: messages.failed }, { status: 503 });
  }
}
