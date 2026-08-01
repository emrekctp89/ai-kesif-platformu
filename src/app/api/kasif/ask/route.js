import logger from '@/utils/logger';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/utils/antiAbuse';
import { assertKasifEnabled } from '@/lib/kasif/config';
import { answerContextlessFollowUp, answerMetaQuestion, answerQuestion } from '@/lib/kasif/engine';
import {
  answerAddToolPrompt,
  detectAddToolIntent,
  formatAddToolResultAnswer,
} from '@/lib/kasif/addToolIntent';
import {
  detectAddToolStatusIntent,
  extractAddToolRefsFromHistory,
  formatAddToolStatusAnswer,
  classifyToolQueueStatus,
} from '@/lib/kasif/addToolStatus';
import { retrievePlatformContext } from '@/lib/kasif/retrieval';
import { understandQuestionWithLlm } from '@/lib/kasif/understanding';
import { groundModelResponse, noInformationAnswer } from '@/lib/kasif/grounding';
import { seedFunnelFromResponse } from '@/lib/kasif/funnel';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { getSoftLandingOpsPin } from '@/lib/kasif/softLandingPin';
import { enhanceKasifConversation } from '@/lib/kasif/conversation';

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

function attachClientIntentMeta(modelResponse, body = {}) {
  const base = modelResponse && typeof modelResponse === 'object' ? modelResponse : {};
  const intent = { ...(base.intent || {}) };
  let changed = false;

  if (body?.fromSoftLanding === true) {
    intent.fromSoftLanding = true;
    const parent = String(body?.softLandingParentId || '')
      .trim()
      .slice(0, 80);
    const starter = String(body?.softLandingStarter || '')
      .trim()
      .slice(0, 40);
    if (parent) intent.softLandingParentId = parent;
    if (starter) intent.softLandingStarter = starter;
    changed = true;
  }

  // Sticky A/B variant from client — stamp on follow-ups and any tagged response.
  if (body?.softLandingVariant === 'A' || body?.softLandingVariant === 'B') {
    if (!intent.softLandingVariant) {
      intent.softLandingVariant = body.softLandingVariant;
      changed = true;
    }
  }

  return changed ? { ...base, intent } : base;
}

async function recordInteraction(question, modelResponse, groundedResponse, userId = null) {
  const feedbackToken = randomUUID();
  try {
    const admin = createAdminClient();
    const funnel = seedFunnelFromResponse(modelResponse, groundedResponse);
    const baseRow = {
      feedback_token: feedbackToken,
      question,
      answer: groundedResponse.answer,
      source_ids: modelResponse.sourceIds || [],
      intent: modelResponse.intent || {},
      confidence: modelResponse.confidence || 0,
      ...(userId ? { user_id: userId } : {}),
    };

    let data = null;
    let error = null;
    ({ data, error } = await admin
      .from('kasif_interactions')
      .insert(funnel ? { ...baseRow, funnel } : baseRow)
      .select('id')
      .single());

    // Personalization migration henüz uygulanmadıysa kaydı kullanıcı bağı olmadan sürdür.
    if (error && userId) {
      const { user_id: _userId, ...anonymousRow } = baseRow;
      logger.warn('Kâşif user history insert failed; retrying without user link.', error?.message);
      ({ data, error } = await admin
        .from('kasif_interactions')
        .insert(funnel ? { ...anonymousRow, funnel } : anonymousRow)
        .select('id')
        .single());
    }

    // Migration henüz uygulanmadıysa funnel kolonu yoktur; etkileşimi yine kaydet.
    if (error && funnel) {
      const { user_id: _userId, ...legacyRow } = baseRow;
      logger.warn('Kâşif funnel insert failed; retrying without funnel.', error?.message);
      ({ data, error } = await admin
        .from('kasif_interactions')
        .insert(legacyRow)
        .select('id')
        .single());
      if (!error && data) {
        return { interactionId: data.id, feedbackToken };
      }
    }

    if (error) throw error;
    return {
      interactionId: data.id,
      feedbackToken,
      ...(funnel ? { funnel } : {}),
    };
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
    let userId = null;
    if (!isLocalEvaluation) {
      try {
        const supabase = await createServerClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id || null;
      } catch {
        userId = null;
      }
    }

    // Soft-landing A/B: client sticky + env force/default + admin ops pin (DB).
    const softLandingVariant =
      body?.softLandingVariant === 'B' || body?.softLandingVariant === 'A'
        ? body.softLandingVariant
        : null;
    const opsPinRow = isLocalEvaluation
      ? { variant: null }
      : await withTimeout(getSoftLandingOpsPin(), 1500, { variant: null });
    const softLandingOverride = {
      variant: softLandingVariant || undefined,
      seed: question,
      opsPin: opsPinRow?.variant || null,
    };

    // Meta / soft-landing yanıtları katalog aramadan döner.
    const directResponse =
      answerMetaQuestion(question, locale) ||
      answerContextlessFollowUp(question, locale, history, softLandingOverride);
    if (directResponse) {
      const taggedDirect = attachClientIntentMeta(directResponse, body);
      const groundedDirect = groundModelResponse(taggedDirect, [], locale);
      const interaction = isLocalEvaluation
        ? {}
        : await withTimeout(
            recordInteraction(question, taggedDirect, groundedDirect, userId),
            3000,
            {}
          );
      return NextResponse.json({
        ...groundedDirect,
        confidence: taggedDirect.confidence || 0.99,
        intent: taggedDirect.intent || {},
        softLanding: Boolean(taggedDirect.softLanding),
        softLandingVariant:
          taggedDirect.softLandingVariant || taggedDirect.intent?.softLandingVariant || null,
        starters: Array.isArray(taggedDirect.starters)
          ? taggedDirect.starters
          : groundedDirect.starters,
        ...interaction,
      });
    }

    // “Durumumu sor” → kuyruktaki adayın onay durumunu kontrol et.
    const statusIntent = detectAddToolStatusIntent(question);
    if (statusIntent.isStatus) {
      const fromHistory = extractAddToolRefsFromHistory(history);
      const url = statusIntent.url || fromHistory.url;
      const slug = statusIntent.slug || fromHistory.slug;

      let statusPayload = {
        status: 'need_ref',
        tool: null,
        queried: { url, slug },
      };

      if (url || slug) {
        if (isLocalEvaluation) {
          statusPayload = {
            status: 'pending',
            tool: {
              name: 'Eval Tool',
              slug: slug || 'eval-tool',
              link: url || 'https://example.com',
              is_approved: false,
            },
            queried: { url, slug },
          };
        } else {
          try {
            const admin = createAdminClient();
            let tool = null;
            if (slug) {
              const { data } = await admin
                .from('tools')
                .select('id, name, slug, link, is_approved, created_at')
                .eq('slug', slug)
                .maybeSingle();
              tool = data || null;
            }
            if (!tool && url) {
              const { data: byLink } = await admin
                .from('tools')
                .select('id, name, slug, link, is_approved, created_at')
                .eq('link', url)
                .limit(1);
              tool = byLink?.[0] || null;
            }
            if (!tool && url) {
              try {
                const host = new URL(url).hostname.replace(/^www\./, '');
                if (host) {
                  const { data: byHost } = await admin
                    .from('tools')
                    .select('id, name, slug, link, is_approved, created_at')
                    .ilike('link', `%${host}%`)
                    .order('created_at', { ascending: false })
                    .limit(5);
                  tool =
                    (byHost || []).find((row) => {
                      try {
                        return new URL(row.link).hostname.replace(/^www\./, '') === host;
                      } catch {
                        return false;
                      }
                    }) || null;
                }
              } catch {
                // ignore bad URL
              }
            }
            statusPayload = {
              status: classifyToolQueueStatus(tool),
              tool,
              queried: { url, slug },
            };
          } catch (error) {
            logger.warn('add-tool status lookup failed:', error?.message || error);
            statusPayload = {
              status: 'not_found',
              tool: null,
              queried: { url, slug },
            };
          }
        }
      }

      const statusResponse = {
        answer: formatAddToolStatusAnswer(statusPayload, locale),
        sourceIds: [],
        insufficientContext: false,
        confidence: 0.92,
        meta: true,
        metaKind: 'add-tool-status',
        intent: {
          concepts: [],
          goals: [],
          pricePreference: 'any',
          comparison: false,
          meta: 'add-tool-status',
          addToolStatus: {
            status: statusPayload.status,
            url: url || null,
            slug: slug || statusPayload.tool?.slug || null,
            name: statusPayload.tool?.name || null,
            is_approved: statusPayload.tool?.is_approved ?? null,
          },
        },
      };
      const taggedStatus = attachClientIntentMeta(statusResponse, body);
      const groundedStatus = groundModelResponse(taggedStatus, [], locale);
      const interaction = isLocalEvaluation
        ? {}
        : await withTimeout(
            recordInteraction(question, taggedStatus, groundedStatus, userId),
            3000,
            {}
          );
      return NextResponse.json({
        ...groundedStatus,
        confidence: taggedStatus.confidence,
        intent: taggedStatus.intent,
        addToolStatus: taggedStatus.intent.addToolStatus,
        ...interaction,
      });
    }

    // “Bu aracı ekle” → scrape aday kuyruğu (is_approved=false, admin gate).
    const addTool = detectAddToolIntent(question);
    if (addTool.isAddTool) {
      if (!addTool.url) {
        const promptResponse = {
          answer: answerAddToolPrompt(locale, addTool),
          sourceIds: [],
          insufficientContext: false,
          confidence: 0.95,
          meta: true,
          metaKind: 'add-tool',
          intent: {
            concepts: [],
            goals: [],
            pricePreference: 'any',
            comparison: false,
            meta: 'add-tool',
            addTool: { status: 'missing_url' },
          },
        };
        const tagged = attachClientIntentMeta(promptResponse, body);
        const grounded = groundModelResponse(tagged, [], locale);
        const interaction = isLocalEvaluation
          ? {}
          : await withTimeout(recordInteraction(question, tagged, grounded, userId), 3000, {});
        return NextResponse.json({
          ...grounded,
          confidence: tagged.confidence,
          intent: tagged.intent,
          addTool: { status: 'missing_url' },
          ...interaction,
        });
      }

      if (isLocalEvaluation) {
        const dry = {
          answer: formatAddToolResultAnswer(
            {
              ok: true,
              status: 'queued',
              candidate: { name: 'Eval Tool', link: addTool.url },
              inserted: { slug: 'eval-tool', link: addTool.url },
            },
            locale
          ),
          sourceIds: [],
          insufficientContext: false,
          confidence: 0.9,
          meta: true,
          metaKind: 'add-tool',
          intent: {
            concepts: [],
            goals: [],
            meta: 'add-tool',
            addTool: { status: 'queued', url: addTool.url, evaluation: true },
          },
        };
        return NextResponse.json({
          ...groundModelResponse(dry, [], locale),
          confidence: dry.confidence,
          intent: dry.intent,
          addTool: dry.intent.addTool,
        });
      }

      const addRate = await enforceRateLimit('kasif-add-tool', {
        limit: 5,
        windowMs: 60 * 60 * 1000,
      });
      if (!addRate.allowed) return fail(messages.rateLimit, 429);

      const { queueToolCandidateFromUrl } = await import('@/lib/kasif/addToolQueue');
      const queueResult = await withTimeout(
        queueToolCandidateFromUrl(addTool.url, {
          suggesterNote: question.slice(0, 200),
          locale,
        }),
        25000,
        { ok: false, error: locale === 'en' ? 'Queue timed out.' : 'Kuyruk zaman aşımı.' }
      );

      const answer = formatAddToolResultAnswer(queueResult, locale);
      const modelResponse = {
        answer,
        sourceIds: [],
        insufficientContext: false,
        confidence: queueResult.ok ? 0.93 : 0.7,
        meta: true,
        metaKind: 'add-tool',
        intent: {
          concepts: [],
          goals: [],
          pricePreference: 'any',
          comparison: false,
          meta: 'add-tool',
          addTool: {
            status: queueResult.status || (queueResult.ok ? 'queued' : 'error'),
            url: addTool.url,
            name: queueResult.candidate?.name || queueResult.inserted?.name || null,
            slug: queueResult.inserted?.slug || null,
            error: queueResult.error || null,
          },
        },
      };
      const tagged = attachClientIntentMeta(modelResponse, body);
      const grounded = groundModelResponse(tagged, [], locale);
      const interaction = await withTimeout(
        recordInteraction(question, tagged, grounded, userId),
        3000,
        {}
      );
      return NextResponse.json({
        ...grounded,
        confidence: tagged.confidence,
        intent: tagged.intent,
        addTool: tagged.intent.addTool,
        ...interaction,
      });
    }

    const understanding = await understandQuestionWithLlm(question);
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

    let modelResponse = attachClientIntentMeta(
      answerQuestion(
        question,
        records,
        history,
        locale,
        understanding.source === 'regex' || understanding.source === 'local'
          ? null
          : understanding.intent
      ),
      body
    );
    modelResponse.intent = {
      ...(modelResponse.intent || {}),
      understanding: {
        source: understanding.source,
        confidence: understanding.confidence,
      },
    };
    if (!isLocalEvaluation) {
      modelResponse = await withTimeout(
        enhanceKasifConversation({ question, history, modelResponse, records, locale }),
        8000,
        modelResponse
      );
    }
    const groundedResponse = groundModelResponse(modelResponse, records, locale);
    const interaction = isLocalEvaluation
      ? {}
      : await withTimeout(
          recordInteraction(question, modelResponse, groundedResponse, userId),
          3000,
          {}
        );
    return NextResponse.json({
      ...groundedResponse,
      confidence: modelResponse.confidence || 0,
      intent: modelResponse.intent || {},
      conversational: Boolean(modelResponse.conversational),
      conversationalSource: modelResponse.conversationalSource || null,
      ...interaction,
    });
  } catch (error) {
    logger.error('Kâşif engine error:', error);
    return fail(messages.unavailable, 503);
  }
}
