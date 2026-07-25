import { NextResponse } from 'next/server';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { getPackAccessSnapshot } from '@/lib/kasif/packAccessServer';
import { FREE_PRO_PACK_QUOTA } from '@/lib/kasif/packAccess';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    assertKasifEnabled();
  } catch {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  try {
    const snapshot = await getPackAccessSnapshot();
    return NextResponse.json({
      isPro: snapshot.isPro,
      isAuthenticated: snapshot.isAuthenticated,
      usedProPackRuns: snapshot.usedProPackRuns,
      freeProPackQuota: FREE_PRO_PACK_QUOTA,
      freeRunsLeft: snapshot.isPro
        ? null
        : Math.max(0, FREE_PRO_PACK_QUOTA - (snapshot.usedProPackRuns || 0)),
      windowDays: snapshot.windowDays,
      packs: snapshot.packs,
    });
  } catch (error) {
    logger.error('pack-access error:', error);
    return NextResponse.json({ error: 'failed' }, { status: 503 });
  }
}
