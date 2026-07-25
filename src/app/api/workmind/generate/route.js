import logger from '@/utils/logger';
import { NextResponse } from 'next/server';

import { PRIMARY_CATEGORIES } from '@/lib/categoryTaxonomy';
import { understandQuestion } from '@/lib/kasif/engine';
import { normalizeWorkmindWorkflow, planWorkmindWorkflow } from '@/lib/kasif/workmindPlanner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GEMINI_MODELS = [
  process.env.GEMINI_TEXT_MODEL,
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
].filter(Boolean);

const GEMINI_TIMEOUT_MS = 18_000;

function buildSystemInstruction() {
  const categoryList = PRIMARY_CATEGORIES.map((c) => `${c.slug} (${c.name})`).join(', ');
  return `Sen bir AI iş akışı mimarısın (Workmind BETA).
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

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || raw;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Model geçerli JSON döndürmedi.');
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

async function generateWithGemini(prompt, apiKey) {
  const systemInstruction = buildSystemInstruction();
  const userPrompt = `${systemInstruction}\n\nKullanıcı hedefi: ${prompt}`;
  const payload = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };

  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        lastError = new Error(
          `Gemini ${modelName} HTTP ${response.status}: ${errBody?.error?.message || response.statusText}`
        );
        continue;
      }

      const result = await response.json();
      const text =
        result?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('') || '';
      if (!text) {
        lastError = new Error(`Gemini ${modelName} boş yanıt`);
        continue;
      }

      const workflow = normalizeWorkmindWorkflow(parseJsonObject(text));
      if (workflow.nodes.length > 0) {
        return { workflow, modelName };
      }
      lastError = new Error(`Gemini ${modelName} boş node listesi`);
    } catch (err) {
      lastError = err?.name === 'AbortError' ? new Error(`Gemini ${modelName} zaman aşımı`) : err;
    } finally {
      clearTimeout(timer);
    }
  }

  return { workflow: null, lastError };
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

    const apiKey = process.env.GEMINI_API_KEY;
    let workflowData = null;
    let source = 'kasif';
    let modelName = null;
    let geminiError = null;
    let plannerMeta = null;

    if (apiKey) {
      const geminiResult = await generateWithGemini(prompt, apiKey);
      if (geminiResult.workflow?.nodes?.length) {
        workflowData = geminiResult.workflow;
        source = 'gemini';
        modelName = geminiResult.modelName;
      } else {
        geminiError = geminiResult.lastError;
        logger.warn(
          'Workmind Gemini unavailable, using Kâşif planner:',
          geminiError?.message || geminiError
        );
      }
    } else {
      logger.warn('Workmind: GEMINI_API_KEY yok; Kâşif yerel planlayıcı kullanılıyor.');
    }

    if (!workflowData?.nodes?.length) {
      const planned = planWorkmindWorkflow(prompt);
      workflowData = { nodes: planned.nodes, edges: planned.edges };
      source = 'kasif';
      plannerMeta = planned.meta || null;
    }

    if (!workflowData?.nodes?.length) {
      logger.error('Workmind generate failed completely:', geminiError);
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
        model: modelName || undefined,
        planner: plannerMeta?.planner,
        goals,
        concepts: plannerMeta?.concepts || intent.concepts || [],
        disclaimer: 'Öneriler otomatik üretilir; sonuçlar hatalı veya eksik olabilir.',
        fallbackFromGemini: Boolean(geminiError),
      },
    });
  } catch (error) {
    logger.error('Workmind generate error:', error);
    return NextResponse.json(
      { error: 'İş akışı üretilemedi. Lütfen tekrar dene.' },
      { status: 500 }
    );
  }
}
