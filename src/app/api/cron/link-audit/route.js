import { NextResponse } from 'next/server';
import { runScheduledLinkAudit } from '@/lib/linkAuditCron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const authorization = request.headers.get('authorization') || '';
  const bearerToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  return bearerToken === secret;
}

function getIntegerParam(searchParams, name) {
  const value = searchParams.get(name);
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
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
