import { NextResponse } from 'next/server';
import { runScheduledToolDiscovery } from '@/lib/toolDiscoveryCron';

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

function getBooleanParam(searchParams, name) {
  const value = searchParams.get(name);
  return value === '1' || value === 'true';
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const report = await runScheduledToolDiscovery({
      limit: getIntegerParam(searchParams, 'limit'),
      candidateCount: getIntegerParam(searchParams, 'candidateCount'),
      timeoutMs: getIntegerParam(searchParams, 'timeoutMs'),
      dryRun: getBooleanParam(searchParams, 'dryRun'),
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
