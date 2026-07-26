import { NextResponse } from 'next/server';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { buildJobReceipt } from '@/lib/kasif/jobReceipt';
import { createAdminClient } from '@/utils/supabase/admin';
import { getSiteOrigin } from '@/utils/siteUrl';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * Public-safe job receipt lookup (requires interaction id + feedback token).
 * GET ?id=&t=&locale=
 */
export async function GET(request) {
  try {
    assertKasifEnabled();
  } catch {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get('id') || '').trim();
  const token = String(searchParams.get('t') || searchParams.get('token') || '').trim();
  const locale = searchParams.get('locale') === 'en' ? 'en' : 'tr';

  if (!id || !token) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('kasif_interactions')
      .select('id, question, intent, funnel, created_at, feedback_token')
      .eq('id', id)
      .eq('feedback_token', token)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    let origin = '';
    try {
      origin = getSiteOrigin() || '';
    } catch {
      origin = '';
    }

    const receipt = buildJobReceipt(data, { locale, origin });
    if (!receipt.hasMilestone) {
      return NextResponse.json(
        {
          error: 'no_milestone',
          receipt: {
            ...receipt,
            // Never expose feedback token in response body.
            feedbackToken: undefined,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      receipt: {
        interactionId: receipt.interactionId,
        hasMilestone: receipt.hasMilestone,
        milestone: receipt.milestone,
        stage: receipt.stage,
        tool: receipt.tool,
        goals: receipt.goals,
        minutesToFirstResult: receipt.minutesToFirstResult,
        packId: receipt.packId,
        artifact: receipt.artifact
          ? {
              bridge: receipt.artifact.bridge,
              packId: receipt.artifact.packId,
              runnerSource: receipt.artifact.runnerSource,
              // Public page: short preview only
              preview: receipt.artifact.preview
                ? String(receipt.artifact.preview).slice(0, 200)
                : null,
              goal: receipt.artifact.goal,
            }
          : null,
        question: receipt.question,
        completedAt: receipt.completedAt,
        sharePath: receipt.sharePath,
        shareUrl: receipt.shareUrl,
        shareText: receipt.shareText,
      },
    });
  } catch (error) {
    logger.error('kasif receipt error:', error);
    return NextResponse.json({ error: 'failed' }, { status: 503 });
  }
}
