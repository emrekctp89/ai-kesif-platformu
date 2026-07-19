import logger from '@/utils/logger';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/utils/antiAbuse';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { answerQuestion } from '@/lib/kasif/engine';
import { retrievePlatformContext } from '@/lib/kasif/retrieval';
import { groundModelResponse, NO_INFORMATION_ANSWER } from '@/lib/kasif/grounding';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

function fail(error, status) {
  return NextResponse.json({ error }, { status });
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-6).flatMap((message) => {
    const role =
      message?.role === 'assistant' ? 'assistant' : message?.role === 'user' ? 'user' : null;
    const content = String(message?.content || '')
      .trim()
      .slice(0, 800);
    return role && content ? [{ role, content }] : [];
  });
}

async function recordInteraction(question, modelResponse, groundedResponse) {
  const feedbackToken = randomUUID();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('kasif_interactions')
      .insert({
        feedback_token: feedbackToken,
        question,
        answer: groundedResponse.answer,
        source_ids: modelResponse.sourceIds || [],
        intent: modelResponse.intent || {},
        confidence: modelResponse.confidence || 0,
      })
      .select('id')
      .single();
    if (error) throw error;
    return { interactionId: data.id, feedbackToken };
  } catch (error) {
    logger.warn('Kâşif interaction could not be recorded.', error?.message);
    return {};
  }
}

function withTimeout(promise, timeoutMs, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

export async function POST(request) {
  try {
    assertKasifEnabled();
  } catch {
    return fail('Kâşif deneyi etkin değil.', 404);
  }

  const rateLimit = await enforceRateLimit('kasif', {
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
  const history = normalizeHistory(body?.history);
  if (question.length < 3 || question.length > 800) {
    return fail('Soru 3–800 karakter arasında olmalıdır.', 400);
  }

  try {
    const records = await retrievePlatformContext(question, history);
    if (!records.length) {
      return NextResponse.json({ answer: NO_INFORMATION_ANSWER, sources: [], grounded: false });
    }

    const modelResponse = answerQuestion(question, records);
    const groundedResponse = groundModelResponse(modelResponse, records);
    const interaction = await withTimeout(
      recordInteraction(question, modelResponse, groundedResponse),
      3000,
      {}
    );
    return NextResponse.json({
      ...groundedResponse,
      confidence: modelResponse.confidence || 0,
      intent: modelResponse.intent || {},
      ...interaction,
    });
  } catch (error) {
    logger.error('Kâşif engine error:', error);
    return fail('Kâşif yanıt üretemedi.', 503);
  }
}
