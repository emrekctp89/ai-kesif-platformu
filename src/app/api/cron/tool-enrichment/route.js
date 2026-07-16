import { NextResponse } from 'next/server';
import { enrichExistingTools } from '@/lib/existingToolEnrichment';
import { getBooleanParam, isCronAuthorized } from '@/utils/cron';

export async function GET(request) {
  if (!isCronAuthorized(request, { allowQuerySecret: true })) {
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
