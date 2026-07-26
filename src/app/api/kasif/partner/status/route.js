import { NextResponse } from 'next/server';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { partnerRunnerStatus } from '@/lib/kasif/partnerRunner';

export const dynamic = 'force-dynamic';

/**
 * Non-secret partner runner status for ops/debug.
 * Does not expose API keys.
 */
export async function GET() {
  try {
    assertKasifEnabled();
  } catch {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  return NextResponse.json({
    partner: partnerRunnerStatus(),
  });
}
