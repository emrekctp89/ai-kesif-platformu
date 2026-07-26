import { NextResponse } from 'next/server';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { formatRunnerSourceLabel, partnerRunnerStatus } from '@/lib/kasif/partnerRunner';
import { describeRunnerProvider } from '@/lib/kasif/partnerConnect';

export const dynamic = 'force-dynamic';

/**
 * Non-secret partner runner status for UI + ops.
 * Does not expose API keys.
 */
export async function GET(request) {
  try {
    assertKasifEnabled();
  } catch {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  const url = new URL(request.url);
  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'tr';
  const partner = partnerRunnerStatus();
  const provider = describeRunnerProvider(partner, locale);

  return NextResponse.json({
    partner,
    provider,
    sourceLabels: {
      partner: formatRunnerSourceLabel('partner', locale),
      gemini: formatRunnerSourceLabel('gemini', locale),
      local: formatRunnerSourceLabel('local', locale),
    },
  });
}
