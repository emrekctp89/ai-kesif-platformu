import { NextResponse } from 'next/server';
import { enrichExistingTools } from '@/lib/existingToolEnrichment';

function getBooleanParam(searchParams, key, fallback = false) {
  const value = searchParams.get(key);
  if (value === null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function isAuthorized(request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) return false;

  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  const querySecret = new URL(request.url).searchParams.get('secret') || '';

  return bearer === configuredSecret || querySecret === configuredSecret;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const report = await enrichExistingTools({
      dryRun: getBooleanParam(searchParams, 'dryRun', true),
      limit: searchParams.get('limit') || undefined,
      includeGoodQuality: getBooleanParam(searchParams, 'includeGoodQuality', false),
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Scheduled tool enrichment failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Tool enrichment failed',
      },
      { status: 500 }
    );
  }
}
