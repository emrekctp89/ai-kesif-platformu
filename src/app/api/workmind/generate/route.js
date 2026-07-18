import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

import { PRIMARY_CATEGORIES } from '@/lib/categoryTaxonomy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GEMINI_MODELS = [
  process.env.GEMINI_TEXT_MODEL,
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
].filter(Boolean);

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

function normalizeWorkflow(data) {
  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const edges = Array.isArray(data?.edges) ? data.edges : [];

  const cleanNodes = nodes
    .map((node, index) => {
      const id = String(node?.id || `step-${index + 1}`).slice(0, 40);
      const label = String(node?.label || `Adım ${index + 1}`)
        .trim()
        .slice(0, 80);
      const description = String(node?.description || '')
        .trim()
        .slice(0, 220);
      const categorySlug = String(node?.categorySlug || 'diger')
        .trim()
        .toLowerCase()
        .slice(0, 80);

      if (!label) return null;
      return { id, label, description, categorySlug };
    })
    .filter(Boolean)
    .slice(0, 6);

  const nodeIds = new Set(cleanNodes.map((n) => n.id));
  let cleanEdges = edges
    .map((edge, index) => {
      const source = String(edge?.source || '');
      const target = String(edge?.target || '');
      if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) return null;
      return {
        id: String(edge?.id || `e-${source}-${target}-${index}`),
        source,
        target,
      };
    })
    .filter(Boolean);

  // Ensure a simple chain if model omitted edges
  if (!cleanEdges.length && cleanNodes.length > 1) {
    cleanEdges = cleanNodes.slice(0, -1).map((node, index) => ({
      id: `e-${node.id}-${cleanNodes[index + 1].id}`,
      source: node.id,
      target: cleanNodes[index + 1].id,
    }));
  }

  return { nodes: cleanNodes, edges: cleanEdges };
}

export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API anahtarı yapılandırılmamış.' }, { status: 500 });
  }

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

    const categoryList = PRIMARY_CATEGORIES.map((c) => `${c.slug} (${c.name})`).join(', ');
    const genAI = new GoogleGenerativeAI(apiKey);

    const systemInstruction = `Sen bir AI iş akışı mimarısın (Workmind BETA).
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

    let lastError = null;
    let workflowData = null;

    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });
        const result = await model.generateContent(
          `${systemInstruction}\n\nKullanıcı hedefi: ${prompt}`
        );
        const text = result?.response?.text?.() || '';
        workflowData = normalizeWorkflow(parseJsonObject(text));
        if (workflowData.nodes.length > 0) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!workflowData?.nodes?.length) {
      console.error('Workmind generate failed:', lastError);
      return NextResponse.json(
        {
          error:
            'İş akışı üretilemedi. Workmind beta aşamasında; lütfen farklı bir ifadeyle tekrar dene.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ...workflowData,
      meta: {
        beta: true,
        disclaimer: 'Öneriler otomatik üretilir; sonuçlar hatalı veya eksik olabilir.',
      },
    });
  } catch (error) {
    console.error('Workmind generate error:', error);
    return NextResponse.json(
      { error: 'İş akışı üretilemedi. Lütfen tekrar dene.' },
      { status: 500 }
    );
  }
}
