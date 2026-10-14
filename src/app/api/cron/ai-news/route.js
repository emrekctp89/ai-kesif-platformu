import { NextResponse } from 'next/server';

import { syncAiNews } from '@/lib/aiNewsFeeds';
import logger from '@/utils/logger';
import { isCronAuthorized } from '@/utils/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  if (!process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Sunucu yapılandırması eksik.' }, { status: 500 });
  }

  if (!isCronAuthorized(request, { allowQuerySecret: true })) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncAiNews();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    logger.error('[cron/ai-news] failed:', error);
    return NextResponse.json({ ok: false, error: 'Haber akışı güncellenemedi.' }, { status: 500 });
  }
}
