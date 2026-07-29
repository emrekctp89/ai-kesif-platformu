import { NextResponse } from 'next/server';
import { refreshMissingToolEmbeddings } from '@/lib/toolEmbeddings';
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
    return NextResponse.json({
      success: true,
      report: await refreshMissingToolEmbeddings({
        limit: getIntegerParam(searchParams, 'limit', { min: 1, max: 200 }) || 100,
      }),
    });
  } catch (error) {
    logger.error('[cron/tool-embeddings] failed:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Embedding refresh failed' },
      { status: 500 }
    );
  }
}
