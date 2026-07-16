import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-2-latest';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: analyticsData, error: analyticsError } = await supabaseAdmin.rpc(
      'get_full_platform_analytics'
    );
    if (analyticsError) throw analyticsError;
    const formattedData = `
      - Son 7 Günlük Büyüme: ${JSON.stringify(analyticsData.growth_rates)}
      - Etkileşim Sıcak Noktaları: ${JSON.stringify(analyticsData.interaction_hotspots)}
      - "Soğuk" Kategoriler: ${JSON.stringify(analyticsData.cold_categories)}
    `;
    const systemPrompt = `Sen 'AI Keşif Platformu'nun Baş Büyüme Sorumlusun. Cevabını SADECE geçerli bir JSON formatında ver. Aşağıdaki şemaya uy:
{
  "briefing_title": "string",
  "summary": "string",
  "opportunities": ["string"],
  "risks": ["string"],
  "action_suggestion": "string"
}`;
    const prompt = `
      İşte bu haftanın analiz raporu. 
      HAFTALIK VERİLER:
      ${formattedData}
      GÖREVİN: Bu verilere dayanarak, admin için bir "Haftalık Stratejik Brifing" hazırla. Bu brifingde, platformu büyütmek için somut ve yaratıcı önerilerde bulun. 
      action_suggestion: Tüm bu analizlere dayanarak, adminin bu hafta odaklanması gereken EN ÖNEMLİ tek bir aksiyon önerisi sun.
    `;

    const apiKey = Deno.env.get('XAI_API_KEY');
    if (!apiKey) throw new Error('XAI_API_KEY bulunamadı. Lütfen Supabase secrets olarak ekleyin.');

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Grok API Hatası: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error('Grok API boş yanıt döndü');

    const analysisResult = JSON.parse(content);

    // Validate required fields
    if (!analysisResult.briefing_title || !analysisResult.summary) {
      throw new Error('Grok yanıtı beklenen formatta değil');
    }

    const { error: insertError } = await supabaseAdmin.from('ai_briefings').insert({
      title: analysisResult.briefing_title,
      summary: analysisResult.summary,
      analysis_data: analysisResult,
    });
    if (insertError) throw insertError;
    return new Response(
      JSON.stringify({
        message: `Haftalık brifing başarıyla oluşturuldu: ${analysisResult.briefing_title}`,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    let errorMessage = 'Bilinmeyen hata';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});
