import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(req) {
  if (!genAI) {
    return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // Using flash for speed
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const systemInstruction = `
You are an expert AI workflow architect. Your job is to take a user's request (e.g. "I want to start a podcast") and convert it into a step-by-step workflow of AI tools.
You must return a valid JSON object matching this schema:
{
  "nodes": [
    {
      "id": "string (unique)",
      "label": "string (title of the step)",
      "description": "string (short description of what to do)",
      "categorySlug": "string (a generic slug for the tool category, e.g. 'yazi-ve-icerik-uretimi', 'ses-ve-muzik-uretimi', 'gorsel-uretimi', 'video-uretimi', 'kodlama-ve-yazilim', 'pazarlama-ve-seo', 'uretkenlik', 'egitim')"
    }
  ],
  "edges": [
    {
      "id": "string",
      "source": "string (node id)",
      "target": "string (node id)"
    }
  ]
}

Create a linear or slightly branching workflow (max 5-6 nodes). The categorySlug should loosely match typical AI tool categories.
Example categories: 'yazi-ve-icerik-uretimi', 'ses-ve-muzik-uretimi', 'video-uretimi', 'gorsel-uretimi', 'kodlama-ve-yazilim', 'pazarlama-ve-seo', 'arastirma-ve-veri-analizi', 'uretkenlik', 'egitim'.
Respond ONLY with the JSON object.
    `;

    const result = await model.generateContent(`${systemInstruction}\n\nUser Request: ${prompt}`);
    const response = await result.response;
    const text = response.text();

    const workflowData = JSON.parse(text);

    return NextResponse.json(workflowData);
  } catch (error) {
    console.error('Workmind generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate workflow. Please try again.' },
      { status: 500 }
    );
  }
}
