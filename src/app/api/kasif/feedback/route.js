import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/utils/antiAbuse';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';

export async function POST(request) {
  try {
    assertKasifEnabled();
  } catch {
    return NextResponse.json({ error: 'Kâşif etkin değil.' }, { status: 404 });
  }

  const rateLimit = await enforceRateLimit('kasif-feedback', {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Çok fazla istek.' }, { status: 429 });

  try {
    const body = await request.json();
    const id = String(body?.interactionId || '');
    const token = String(body?.feedbackToken || '');
    const feedback = Number(body?.feedback);
    if (!id || !token || ![-1, 1].includes(feedback)) {
      return NextResponse.json({ error: 'Geçersiz geri bildirim.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('kasif_interactions')
      .update({ feedback, feedback_at: new Date().toISOString() })
      .eq('id', id)
      .eq('feedback_token', token)
      .is('feedback', null)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Geri bildirim bulunamadı.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Kâşif feedback error:', error);
    return NextResponse.json({ error: 'Geri bildirim kaydedilemedi.' }, { status: 503 });
  }
}
