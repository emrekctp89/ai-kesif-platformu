import { NextResponse } from 'next/server';
import { refreshKasifGoalCandidates } from '@/lib/kasif/server';
import { getIntegerParam, isCronAuthorized } from '@/utils/cron';
import logger from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  try {
    const report = await refreshKasifGoalCandidates({
      lookbackDays: getIntegerParam(searchParams, 'lookbackDays', { min: 7, max: 365 }) || 90,
      embeddingLimit: getIntegerParam(searchParams, 'embeddingLimit', { min: 1, max: 500 }) || 200,
      minimumClusterSize:
        getIntegerParam(searchParams, 'minimumClusterSize', { min: 2, max: 100 }) || 3,
    });
    return NextResponse.json({ success: true, report });
  } catch (error) {
    logger.error('[cron/kasif-goal-candidates] failed:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Goal candidate refresh failed' },
      { status: 500 }
    );
  }
}
