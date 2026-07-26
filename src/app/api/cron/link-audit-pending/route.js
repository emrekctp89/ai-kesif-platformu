import logger from '@/utils/logger';
import { NextResponse } from 'next/server';
import { runScheduledLinkAudit } from '@/lib/linkAuditCron';
import { getIntegerParam, isCronAuthorized } from '@/utils/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily job: only never-checked + problem-status tools.
 * Keeps new submissions from sitting as "Kontrol bekliyor" for days.
 */
async function handle(request) {
  if (!isCronAuthorized(request, { allowQuerySecret: true })) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const report = await runScheduledLinkAudit({
      priority: 'pending',
      batchSize:
        getIntegerParam(searchParams, 'batchSize', { min: 1 }) ??
        getIntegerParam(searchParams, 'limit', { min: 1 }),
      maxTools: getIntegerParam(searchParams, 'maxTools', { min: 1 }),
      timeoutMs: getIntegerParam(searchParams, 'timeoutMs', { min: 1 }),
      concurrency: getIntegerParam(searchParams, 'concurrency', { min: 1 }),
      maxRuntimeMs: getIntegerParam(searchParams, 'maxRuntimeMs', { min: 1000 }),
      // pending mode ignores stale window; still accept param for symmetry
      staleDays: getIntegerParam(searchParams, 'staleDays', { min: 1 }),
    });

    return NextResponse.json({
      success: true,
      message:
        report.summary.scannedCount === 0
          ? 'Bekleyen yeni/problemli link yok.'
          : `${report.summary.scannedCount} bekleyen araç linki kontrol edildi.`,
      report,
    });
  } catch (error) {
    logger.error('Pending link audit failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Pending link audit failed',
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return handle(request);
}

export async function POST(request) {
  return handle(request);
}
