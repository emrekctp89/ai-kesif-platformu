import { NextResponse } from 'next/server';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { getReceiptSocialProofStats } from '@/lib/kasif/receiptSocialProofServer';
import { getIntegerParam } from '@/utils/cron';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * Public anonymized first_result / job_done counters for landing social proof.
 * GET ?windowDays=30
 * Never returns questions, tokens, or interaction ids.
 */
export async function GET(request) {
  try {
    assertKasifEnabled();
  } catch {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const windowDays = getIntegerParam(searchParams, 'windowDays', { min: 1, max: 90 });

    const stats = await getReceiptSocialProofStats({
      windowDays: windowDays ?? 30,
    });

    return NextResponse.json(
      {
        stats: {
          windowDays: stats.windowDays,
          generatedAt: stats.generatedAt,
          withMilestone: stats.withMilestone,
          firstResults: stats.firstResults,
          jobDones: stats.jobDones,
          runnerCount: stats.runnerCount,
          bridgePasteCount: stats.bridgePasteCount,
          avgMinutesToFirstResult: stats.avgMinutesToFirstResult,
          doneOfFirstResult: stats.doneOfFirstResult,
          topPacks: stats.topPacks,
          minVisible: stats.minVisible,
          visible: stats.visible,
        },
        cached: Boolean(stats.cached),
      },
      {
        status: 200,
        headers: {
          // Short edge/browser cache; server also memoizes ~5m.
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    logger.error('receipt-stats error:', error);
    return NextResponse.json({ error: 'failed' }, { status: 503 });
  }
}
