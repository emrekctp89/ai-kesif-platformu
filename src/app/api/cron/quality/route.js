import { NextResponse } from 'next/server';
import { runToolQualityAutomation } from '@/app/actions/tools';
import { isCronAuthorized } from '@/utils/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Quality automation endpoint.
 * Triggered by Vercel Cron and/or Google Cloud Scheduler.
 * Auth: Authorization: Bearer <CRON_SECRET> or ?secret=
 */
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret && process.env.NODE_ENV === 'production') {
    console.error('[cron/quality] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Sunucu yapılandırması eksik.' }, { status: 500 });
  }

  if (!isCronAuthorized(request, { allowQuerySecret: true })) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Pass secret so the action can run without an admin browser session.
    const result = await runToolQualityAutomation({ cronSecret });

    if (result?.error) {
      return NextResponse.json(
        { success: false, error: result.error, details: result },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Kalite otomasyonu başarıyla tamamlandı.',
        details: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[cron/quality] failed:', error);
    return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.' }, { status: 500 });
  }
}
