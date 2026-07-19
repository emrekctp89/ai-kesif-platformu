import logger from '@/utils/logger';
import { NextResponse } from 'next/server';
import { reassignTodayDailyQuests } from '@/app/actions/quests';
import { isCronAuthorized } from '@/utils/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Re-assign today's daily quests (e.g. after catalog repoint).
 * Auth: Authorization: Bearer <CRON_SECRET> or ?secret=
 */
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret && process.env.NODE_ENV === 'production') {
    logger.error('[cron/quests-reassign] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Sunucu yapılandırması eksik.' }, { status: 500 });
  }

  if (!isCronAuthorized(request, { allowQuerySecret: true })) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await reassignTodayDailyQuests({ cronSecret });
    if (result?.error) {
      return NextResponse.json({ success: false, ...result }, { status: 500 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error('[cron/quests-reassign] failed:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Quest reassign failed' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  return GET(request);
}
