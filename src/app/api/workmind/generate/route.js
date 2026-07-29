import logger from '@/utils/logger';
import { NextResponse } from 'next/server';

import { PRIMARY_CATEGORIES } from '@/lib/categoryTaxonomy';
import {
  callLlmJson,
  normalizeWorkmindWorkflow,
  planWorkmindWorkflow,
  understandQuestion,
} from '@/lib/kasif/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildSystemInstruction() {
  const categoryList = PRIMARY_CATEGORIES.map((c) => `${c.slug} (${c.name})`).join(', ');
  return `Sen bir AI iş akışı mimarısın (Workmind BETA / Kâşif).
Kullanıcının hedefini 3-6 adımlık pratik bir iş akışına böl.
Her adım için platformdaki bir kategori slug'ı seç.

İzinli categorySlug değerleri:
${categoryList}

Sadece geçerli JSON döndür:
{
  "nodes": [
    {
      "id": "step-1",
      "label": "Kısa adım başlığı",
      "description": "Bu adımda ne yapılacağını 1-2 cümleyle anlat",
      "categorySlug": "izinli-slug"
    }
  ],
  "edges": [
    { "id": "e1", "source": "step-1", "target": "step-2" }
  ]
}

Kurallar:
- categorySlug yalnızca izinli listeden olmalı; emin değilsen "diger"
- Linear veya hafif dallı akış
- Uydurma araç adı yazma; sadece adımlar
- Türkçe label/description
- En fazla 6 node`;
}

/**
 * Cloud path: Partner → Gemini via shared Kâşif LLM chain.
 * @param {string} prompt
 * @returns {Promise<{ workflow: object|null, source: string|null, error?: Error }>}
 */
async function generateWithKasifCloud(prompt) {
  const userPrompt = `${buildSystemInstruction()}\n\nKullanıcı hedefi: ${prompt}`;
  try {
    const { data, source } = await callLlmJson(userPrompt);
    if (!data || typeof data !== 'object') {
      return { workflow: null, source: null };
    }
    const workflow = normalizeWorkmindWorkflow(data);
    if (workflow.nodes.length > 0) {
      return { workflow, source: source || 'gemini' };
    }
    return { workflow: null, source: null, error: new Error('empty_nodes') };
  } catch (err) {
    return {
      workflow: null,
      source: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const prompt = String(body?.prompt || '').trim();

    if (prompt.length < 8) {
      return NextResponse.json(
        { error: 'Lütfen hedefini en az birkaç kelimeyle yaz.' },
        { status: 400 }
      );
    }

    if (prompt.length > 800) {
      return NextResponse.json({ error: 'Prompt çok uzun (max 800 karakter).' }, { status: 400 });
    }

    let workflowData = null;
    let source = 'kasif';
    let modelName = null;
    let cloudError = null;
    let plannerMeta = null;

    const cloud = await generateWithKasifCloud(prompt);
    if (cloud.workflow?.nodes?.length) {
      workflowData = cloud.workflow;
      source = cloud.source === 'partner' ? 'partner' : 'gemini';
      modelName = source;
    } else if (cloud.error) {
      cloudError = cloud.error;
      logger.warn(
        'Workmind cloud chain unavailable, using Kâşif planner:',
        cloudError?.message || cloudError
      );
    }

    if (!workflowData?.nodes?.length) {
      const planned = planWorkmindWorkflow(prompt);
      workflowData = { nodes: planned.nodes, edges: planned.edges };
      source = 'kasif';
      plannerMeta = planned.meta || null;
    }

    if (!workflowData?.nodes?.length) {
      logger.error('Workmind generate failed completely:', cloudError);
      return NextResponse.json(
        {
          error:
            'İş akışı üretilemedi. Workmind beta aşamasında; lütfen farklı bir ifadeyle tekrar dene.',
        },
        { status: 502 }
      );
    }

    const intent = understandQuestion(prompt);
    const goals =
      (Array.isArray(plannerMeta?.goals) && plannerMeta.goals.length
        ? plannerMeta.goals
        : intent.goals) || [];

    return NextResponse.json({
      ...workflowData,
      meta: {
        beta: true,
        source,
        engine: 'kasif',
        model: modelName || undefined,
        planner: plannerMeta?.planner,
        goals,
        concepts: plannerMeta?.concepts || intent.concepts || [],
        disclaimer: 'Öneriler otomatik üretilir; sonuçlar hatalı veya eksik olabilir.',
        fallbackFromCloud: Boolean(cloudError),
        // backward-compatible flag for older clients
        fallbackFromGemini: Boolean(cloudError),
      },
    });
  } catch (error) {
    logger.error('Workmind generate error:', error);
    return NextResponse.json({ error: 'Beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
