import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/utils/antiAbuse';
import { assertKasifEnabled } from '@/lib/kasif/config';
import {
  isSupportedCompletionPartner,
  sha256,
  VERIFIED_COMPLETION_PARTNERS,
} from '@/lib/kasif/completionVerification';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
    assertKasifEnabled();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  const limited = await enforceRateLimit('kasif-completion-claim', {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: 'Çok fazla istek.' }, { status: 429 });
  }

  const interactionId = String(body?.interactionId || '').trim();
  const feedbackToken = String(body?.feedbackToken || '').trim();
  const toolSlug = String(body?.toolSlug || '')
    .trim()
    .toLowerCase();
  if (!interactionId || !feedbackToken || !isSupportedCompletionPartner(toolSlug)) {
    return NextResponse.json(
      { error: 'Geçersiz istek.', supportedPartners: VERIFIED_COMPLETION_PARTNERS },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const { data: interaction, error: readError } = await admin
      .from('kasif_interactions')
      .select('id')
      .eq('id', interactionId)
      .eq('feedback_token', feedbackToken)
      .maybeSingle();
    if (readError) throw readError;
    if (!interaction) {
      return NextResponse.json({ error: 'Etkileşim bulunamadı.' }, { status: 404 });
    }

    const claimToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: insertError } = await admin.from('kasif_completion_claims').insert({
      interaction_id: interactionId,
      tool_slug: toolSlug,
      token_hash: sha256(claimToken),
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    return NextResponse.json({ claimToken, toolSlug, expiresAt });
  } catch (error) {
    logger.error('Kâşif completion claim error:', error);
    return NextResponse.json({ error: 'Doğrulama talebi oluşturulamadı.' }, { status: 503 });
  }
}
