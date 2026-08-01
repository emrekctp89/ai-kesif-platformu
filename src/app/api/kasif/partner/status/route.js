import { NextResponse } from 'next/server';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { formatRunnerSourceLabel, partnerRunnerStatus } from '@/lib/kasif/partnerRunner';
import { describeRunnerProvider } from '@/lib/kasif/partnerConnect';
import { getKasifDeepseekMode } from '@/lib/kasif/deepseekMode';

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
  const storedMode = await getKasifDeepseekMode();
  const deepseekConfigured = Boolean(partner.configured && partner.via?.includes('deepseek'));

  return NextResponse.json({
    partner,
    provider,
    deepseekMode: {
      enabled: storedMode.enabled && deepseekConfigured,
      requestedEnabled: storedMode.enabled,
      configured: deepseekConfigured,
      updatedAt: storedMode.updatedAt,
      source: storedMode.source,
    },
    sourceLabels: {
      partner: formatRunnerSourceLabel('partner', locale),
      deepseek: formatRunnerSourceLabel('deepseek', locale),
      gemini: formatRunnerSourceLabel('gemini', locale),
      local: formatRunnerSourceLabel('local', locale),
    },
  });
}
