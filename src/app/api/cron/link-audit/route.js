import { NextResponse } from 'next/server';
import { runScheduledLinkAudit } from '@/lib/linkAuditCron';
import { getIntegerParam, isCronAuthorized } from '@/utils/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const report = await runScheduledLinkAudit({
      limit: getIntegerParam(searchParams, 'limit'),
      timeoutMs: getIntegerParam(searchParams, 'timeoutMs'),
      concurrency: getIntegerParam(searchParams, 'concurrency'),
      staleDays: getIntegerParam(searchParams, 'staleDays'),
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Scheduled link audit failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Link audit failed',
      },
      { status: 500 }
    );
  }
}
