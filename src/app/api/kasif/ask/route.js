import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/utils/antiAbuse';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { askLocalModel } from '@/lib/kasif/provider';
import { retrievePlatformContext, serializeContext } from '@/lib/kasif/retrieval';
import { groundModelResponse, NO_INFORMATION_ANSWER } from '@/lib/kasif/grounding';

export const dynamic = 'force-dynamic';

function fail(error, status) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request) {
  try {
    assertKasifEnabled();
  } catch {
    return fail('Kâşif deneyi etkin değil.', 404);
  }

  const rateLimit = await enforceRateLimit('local-kasif', {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) return fail('Çok fazla istek gönderildi.', 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Geçersiz istek.', 400);
  }

  const question = String(body?.question || '').trim();
  if (question.length < 3 || question.length > 800) {
    return fail('Soru 3–800 karakter arasında olmalıdır.', 400);
  }

  try {
    const records = await retrievePlatformContext(question);
    if (!records.length) {
      return NextResponse.json({ answer: NO_INFORMATION_ANSWER, sources: [], grounded: false });
    }

    const modelResponse = await askLocalModel({
      question,
      context: serializeContext(records),
    });
    return NextResponse.json(groundModelResponse(modelResponse, records));
  } catch (error) {
    console.error('Kâşif local AI error:', error);
    const unavailable = ['LOCAL_MODEL_TIMEOUT', 'fetch failed'].some((code) =>
      String(error?.message).includes(code)
    );
    return fail(
      unavailable ? 'Yerel Kâşif modeli şu anda erişilemiyor.' : 'Kâşif yanıt üretemedi.',
      503
    );
  }
}
