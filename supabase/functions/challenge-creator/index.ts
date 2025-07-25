import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
// Bu ana fonksiyon, Edge Function çağrıldığında çalışır
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error("GEMINI_API_KEY bulunamadı.");
    // 1. ADIM: Gemini için özel prompt'u oluştur
    const prompt = `
        Sen, 'AI Keşif Platformu' adlı bir topluluk sitesi için içerik üreten bir yapay zekasın. Görevin, yapay zeka ile görsel veya metin üreten kullanıcılar için, bir hafta sürecek, son derece yaratıcı, eğlenceli ve ilham verici bir YARIŞMA TEMASI oluşturmaktır.

        Örnek Temalar: "Geleceğin Şehirleri", "Fantastik Yaratık Portreleri", "Bir Şiirin İlk Mısrası".

        Şimdi, bu hafta için yeni bir tema oluştur. Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
    `;
    // 2. ADIM: Gemini API'sine isteği hazırla ve gönder
    const chatHistory = [
      {
        role: "user",
        parts: [
          {
            text: prompt
          }
        ]
      }
    ];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            "title": {
              "type": "STRING",
              "description": "Yarışma için kısa ve dikkat çekici bir başlık."
            },
            "description": {
              "type": "STRING",
              "description": "Kullanıcılara ilham verecek, temayı açıklayan 1-2 cümlelik bir metin."
            }
          },
          required: [
            "title",
            "description"
          ]
        }
      }
    };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API Hatası: ${errorBody}`);
    }
    const result = await response.json();
    const challengeData = JSON.parse(result.candidates[0].content.parts[0].text);
    // 3. ADIM: Oluşturulan yeni yarışmayı veritabanına kaydet
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const { error: insertError } = await supabaseAdmin.from('challenges').insert({
      title: challengeData.title,
      description: challengeData.description,
      status: 'Aktif',
      start_date: today.toISOString().split('T')[0],
      end_date: nextWeek.toISOString().split('T')[0]
    });
    if (insertError) throw insertError;
    return new Response(JSON.stringify({
      message: `Yeni yarışma başarıyla oluşturuldu: "${challengeData.title}"`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error)
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
