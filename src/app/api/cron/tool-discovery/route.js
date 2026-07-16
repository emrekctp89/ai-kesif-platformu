import { NextResponse } from 'next/server';
import { runScheduledToolDiscovery } from '@/lib/toolDiscoveryCron';
import { getBooleanParam, getIntegerParam, isCronAuthorized } from '@/utils/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  if (!isCronAuthorized(request, { allowQuerySecret: true })) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const report = await runScheduledToolDiscovery({
      limit: getIntegerParam(searchParams, 'limit'),
      candidateCount: getIntegerParam(searchParams, 'candidateCount'),
      timeoutMs: getIntegerParam(searchParams, 'timeoutMs'),
      dryRun: getBooleanParam(searchParams, 'dryRun'),
      autoApprove: getBooleanParam(searchParams, 'autoApprove'),
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Scheduled tool discovery failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Tool discovery failed',
      },
      { status: 500 }
    );
  }
}
