import logger from '@/utils/logger';
import { NextResponse } from 'next/server';
import { runScheduledToolScrape } from '@/lib/toolScrape/scheduledRun';
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
    const report = await runScheduledToolScrape({
      categorySlug: searchParams.get('category') || 'all',
      provider: searchParams.get('provider') || undefined,
      quota: getIntegerParam(searchParams, 'quota', { min: 1, max: 10 }),
      limit: getIntegerParam(searchParams, 'limit', { min: 1, max: 10 }),
      retries: getIntegerParam(searchParams, 'retries', { min: 0, max: 2 }),
      timeoutMs: getIntegerParam(searchParams, 'timeoutMs', { min: 3000, max: 20000 }),
    });
    return NextResponse.json({ success: true, report });
  } catch (error) {
    logger.error('Scheduled tool scrape failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Tool scrape failed',
      },
      { status: 500 }
    );
  }
}
