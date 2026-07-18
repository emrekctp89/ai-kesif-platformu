import { NextResponse } from 'next/server';

/**
 * Lightweight liveness probe for uptime monitors (UptimeRobot, Better Stack, etc.).
 * Does not touch the database — keeps checks fast and cheap.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const body = () => ({
  ok: true,
  service: 'ai-kesif-platformu',
  ts: new Date().toISOString(),
});

const headers = {
  'Cache-Control': 'no-store, max-age=0',
};

export function GET() {
  return NextResponse.json(body(), { status: 200, headers });
}

export function HEAD() {
  return new NextResponse(null, { status: 200, headers });
}
