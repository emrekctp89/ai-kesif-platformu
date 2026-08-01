import { NextResponse } from 'next/server';
import { buildKasifRuntimeStatus } from '@/lib/kasif/release';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(buildKasifRuntimeStatus(process.env), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
