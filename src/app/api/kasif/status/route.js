import { NextResponse } from 'next/server';
import { buildKasifRuntimeStatus } from '@/lib/kasif/release';
import { getKasifDeepseekMode } from '@/lib/kasif/deepseekMode';

export const dynamic = 'force-dynamic';

export async function GET() {
  const deepseekMode = await getKasifDeepseekMode();
  return NextResponse.json(
    buildKasifRuntimeStatus(process.env, { deepseekEnabled: deepseekMode.enabled }),
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
