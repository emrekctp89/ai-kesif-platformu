import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: analyticsData, error: analyticsError } =
      await supabaseAdmin.rpc("get_full_platform_analytics");
    if (analyticsError) throw analyticsError;

    const formattedData = `
        - Son 7 Günlük Büyüme: ${JSON.stringify(analyticsData.growth_rates)}
        - Etkileşim Sıcak Noktaları: ${JSON.stringify(analyticsData.interaction_hotspots)}
        - "Soğuk" Kategoriler: ${JSON.stringify(analyticsData.cold_categories)}
    `;

    const prompt = `
        Sen 'AI Keşif Platformu'nun Baş Büyüme Sorumlusun. İşte bu haftanın analiz raporu. 
        HAFTALIK VERİLER:
        ${formattedData}
        GÖREVİN: Bu verilere dayanarak, admin için bir "Haftalık Stratejik Brifing" hazırla. Bu brifingde, platformu büyütmek için somut ve yaratıcı önerilerde bulun. Cevabını SADECE aşağıdaki JSON formatında ver.
    `;

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            briefing_title: { type: "STRING" },
            summary: { type: "STRING" },
            opportunities: { type: "ARRAY", items: { type: "STRING" } },
            risks: { type: "ARRAY", items: { type: "STRING" } },
            // YENİ: AI'dan somut bir aksiyon önerisi istiyoruz.
            action_suggestion: {
              type: "STRING",
              description:
                "Tüm bu analizlere dayanarak, adminin bu hafta odaklanması gereken EN ÖNEMLİ tek bir aksiyon önerisi sun.",
            },
          },
          required: [
            "briefing_title",
            "summary",
            "opportunities",
            "risks",
            "action_suggestion",
          ],
        },
      },
    };

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY bulunamadı.");

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API Hatası: ${errorBody}`);
    }

    const result = await response.json();
    const analysisResult = JSON.parse(
      result.candidates[0].content.parts[0].text
    );

    // Oluşturulan analizi veritabanına kaydet
    const { error: insertError } = await supabaseAdmin
      .from("ai_briefings")
      .insert({
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
