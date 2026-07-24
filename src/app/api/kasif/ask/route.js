import logger from '@/utils/logger';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/utils/antiAbuse';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { answerContextlessFollowUp, answerMetaQuestion, answerQuestion } from '@/lib/kasif/engine';
import { retrievePlatformContext } from '@/lib/kasif/retrieval';
import { groundModelResponse, noInformationAnswer } from '@/lib/kasif/grounding';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

function fail(error, status) {
  return NextResponse.json({ error }, { status });
}

const API_MESSAGES = {
  tr: {
    disabled: 'Kâşif deneyi etkin değil.',
    rateLimit: 'Çok fazla istek gönderildi.',
    invalid: 'Geçersiz istek.',
    questionLength: 'Soru 3–800 karakter arasında olmalıdır.',
    unavailable: 'Kâşif yanıt üretemedi.',
  },
  en: {
    disabled: 'The Kâşif experiment is not enabled.',
    rateLimit: 'Too many requests.',
    invalid: 'Invalid request.',
    questionLength: 'The question must be between 3 and 800 characters.',
    unavailable: 'Kâşif could not generate an answer.',
  },
};

function requestLocale(value) {
  return value === 'en' ? 'en' : 'tr';
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
  let body;
  try {
    body = await request.json();
  } catch {
    return fail(API_MESSAGES.tr.invalid, 400);
  }
  const locale = requestLocale(body?.locale);
  const messages = API_MESSAGES[locale];

  try {
    assertKasifEnabled();
  } catch {
    return fail(messages.disabled, 404);
  }

  const isLocalEvaluationRequest =
    process.env.NODE_ENV !== 'production' && request.headers.get('x-kasif-evaluation') === '1';
  const rateLimit = isLocalEvaluationRequest
    ? { allowed: true }
    : await enforceRateLimit('kasif', {
        limit: 10,
        windowMs: 10 * 60 * 1000,
      });
  if (!rateLimit.allowed) return fail(messages.rateLimit, 429);

  const question = String(body?.question || '').trim();
  const history = normalizeHistory(body?.history);
  if (question.length < 3 || question.length > 800) {
    return fail(messages.questionLength, 400);
  }

  try {
    const isLocalEvaluation = body?.evaluation === true && isLocalEvaluationRequest;

    // Meta / soft-landing yanıtları katalog aramadan döner.
    const directResponse =
      answerMetaQuestion(question, locale) || answerContextlessFollowUp(question, locale, history);
    if (directResponse) {
      const groundedDirect = groundModelResponse(directResponse, [], locale);
      const interaction = isLocalEvaluation
        ? {}
        : await withTimeout(recordInteraction(question, directResponse, groundedDirect), 3000, {});
      return NextResponse.json({
        ...groundedDirect,
        confidence: directResponse.confidence || 0.99,
        intent: directResponse.intent || {},
        softLanding: Boolean(directResponse.softLanding),
        ...interaction,
      });
    }

    const records = await retrievePlatformContext(question, history);
    if (!records.length) {
      return NextResponse.json({
        answer: noInformationAnswer(locale),
        sources: [],
        grounded: false,
        confidence: 0,
        intent: {},
      });
    }

    const modelResponse = answerQuestion(question, records, history, locale);
    const groundedResponse = groundModelResponse(modelResponse, records, locale);
    const interaction = isLocalEvaluation
      ? {}
      : await withTimeout(recordInteraction(question, modelResponse, groundedResponse), 3000, {});
    return NextResponse.json({
      ...groundedResponse,
      confidence: modelResponse.confidence || 0,
      intent: modelResponse.intent || {},
      ...interaction,
    });
  } catch (error) {
    logger.error('Kâşif engine error:', error);
    return fail(messages.unavailable, 503);
  }
}
