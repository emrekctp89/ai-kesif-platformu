import logger from '@/utils/logger';
import { NextResponse } from 'next/server';
import { getBooleanParam, getIntegerParam, isCronAuthorized } from '@/utils/cron';
import { runKasifOpsDigest } from '@/lib/kasif/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Weekly Kâşif ops digest (funnel + pack ROI + soft-landing pin).
 * Auth: Authorization: Bearer <CRON_SECRET> or ?secret=
 *
 * Query:
 * - windowDays (1–90, default 7)
 * - limit (50–2000, default 500)
 * - dryRun=1 — build snapshot, do not send email
 * - forceSend=1 — send even if KASIF_OPS_DIGEST is not true
 */
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret && process.env.NODE_ENV === 'production') {
    logger.error('[cron/kasif-ops-digest] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Sunucu yapılandırması eksik.' }, { status: 500 });
  }

  if (!isCronAuthorized(request, { allowQuerySecret: true })) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const windowDays = getIntegerParam(searchParams, 'windowDays', { min: 1, max: 90 });
  const limit = getIntegerParam(searchParams, 'limit', { min: 50, max: 2000 });
  const dryRun = getBooleanParam(searchParams, 'dryRun', false);
  const forceSend = getBooleanParam(searchParams, 'forceSend', false);

  try {
    const result = await runKasifOpsDigest({
      windowDays: windowDays ?? 7,
      limit: limit ?? 500,
      dryRun,
      forceSend,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error, details: result },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Kâşif ops digest tamamlandı.',
        windowDays: result.windowDays,
        rowCount: result.rowCount,
        subject: result.subject,
        email: result.email,
        history: result.history
          ? {
              ok: result.history.ok,
              error: result.history.error || null,
              lastSavedAt: result.history.history?.last?.savedAt || null,
              historyCount: result.history.history?.history?.length ?? null,
            }
          : null,
        snapshot: result.snapshot,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('[cron/kasif-ops-digest] failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Ops digest failed',
      },
      { status: 500 }
    );
  }
}
