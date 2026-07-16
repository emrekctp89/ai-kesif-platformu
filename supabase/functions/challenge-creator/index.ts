import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-2-latest';

// Bu ana fonksiyon, Edge Function çağrıldığında çalışır
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
    const apiKey = Deno.env.get('XAI_API_KEY');
    if (!apiKey) throw new Error('XAI_API_KEY bulunamadı. Lütfen Supabase secrets olarak ekleyin.');

    // 1. ADIM: Grok için özel prompt'u oluştur
    const systemPrompt = `Sen, 'AI Keşif Platformu' adlı bir topluluk sitesi için içerik üreten bir yapay zekasın. Cevabını SADECE geçerli bir JSON formatında ver. Aşağıdaki şemaya uy:
{
  "title": "string",
  "description": "string"
}`;
    const prompt = `
        Görevin, yapay zeka ile görsel veya metin üreten kullanıcılar için, bir hafta sürecek, son derece yaratıcı, eğlenceli ve ilham verici bir YARIŞMA TEMASI oluşturmaktır.

        Örnek Temalar: "Geleceğin Şehirleri", "Fantastik Yaratık Portreleri", "Bir Şiirin İlk Mısrası".

        Şimdi, bu hafta için yeni bir tema oluştur. title: Yarışma için kısa ve dikkat çekici bir başlık. description: Kullanıcılara ilham verecek, temayı açıklayan 1-2 cümlelik bir metin.
    `;

    // 2. ADIM: Grok API'sine isteği hazırla ve gönder
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
        temperature: 0.9,
        max_tokens: 500,
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

    const challengeData = JSON.parse(content);

    if (!challengeData.title || !challengeData.description) {
      throw new Error('Grok yanıtı beklenen formatta değil');
    }

    // 3. ADIM: Oluşturulan yeni yarışmayı veritabanına kaydet
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const { error: insertError } = await supabaseAdmin.from('challenges').insert({
      title: challengeData.title,
      description: challengeData.description,
      status: 'Aktif',
      start_date: today.toISOString().split('T')[0],
      end_date: nextWeek.toISOString().split('T')[0],
    });
    if (insertError) throw insertError;
    return new Response(
      JSON.stringify({
        message: `Yeni yarışma başarıyla oluşturuldu: "${challengeData.title}"`,
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
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
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
