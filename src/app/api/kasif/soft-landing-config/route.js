import { NextResponse } from 'next/server';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { getSoftLandingVariantConfig } from '@/lib/kasif/softLanding';
import { getSoftLandingOpsPin } from '@/lib/kasif/softLandingPin';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * Public (no secrets) soft-landing assignment config for client sticky init.
 * GET → { force, opsPin, defaultVariant, mode, effectivePin }
 */
export async function GET() {
  try {
    assertKasifEnabled();
  } catch {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  try {
    const pin = await getSoftLandingOpsPin();
    const config = getSoftLandingVariantConfig({ opsPin: pin.variant });
    const effectivePin =
      config.force ||
      config.opsPin ||
      (config.defaultVariant !== 'ab' ? config.defaultVariant : null);

    return NextResponse.json({
      force: config.force,
      opsPin: config.opsPin,
      defaultVariant: config.defaultVariant,
      mode: config.mode,
      effectivePin,
      pinnedAt: pin.pinnedAt,
    });
  } catch (error) {
    logger.error('soft-landing-config error:', error);
    return NextResponse.json({
      force: null,
      opsPin: null,
      defaultVariant: 'ab',
      mode: 'ab_split',
      effectivePin: null,
      pinnedAt: null,
    });
  }
}
