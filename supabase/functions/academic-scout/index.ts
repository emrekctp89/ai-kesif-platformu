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
    // 1. ADIM: Henüz hakkında makale bulunmamış, onaylanmış araçları çek
    const { data: tools, error: fetchError } = await supabaseAdmin.from('tools').select('id, name, description').eq('is_approved', true).not('id', 'in', `(SELECT tool_id FROM public.post_tools)`) // 'post_tools'da kaydı olmayanlar
    .limit(1); // Her çalıştığında sadece 1 aracı işle
    if (fetchError) throw fetchError;
    if (!tools || tools.length === 0) {
      return new Response(JSON.stringify({
        message: "İşlenecek yeni araç bulunmuyor."
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const tool = tools[0];
    // 2. ADIM: Gemini için özel "araştırmacı" prompt'unu oluştur
    const prompt = `
        Sen, yapay zeka alanında uzman bir akademik araştırmacısın. Görevin, sana verilen bir AI aracının adını ve tanımını kullanarak, o aracın temelini oluşturan en önemli 1 adet bilimsel makaleyi bulmaktır.

        ARAÇ BİLGİLERİ:
        - Adı: "${tool.name}"
        - Tanımı: "${tool.description}"

        YAPILACAKLAR:
        1.  Bu aracın teknolojisiyle ilgili en temel ve en çok atıf alan bilimsel makaleyi bul.
        2.  Bu makalenin başlığını, yazarlarını, yayınlandığı platformu (örn: arXiv, Nature) ve PDF'ine ulaşılabilecek bir URL'i bul.
        3.  Makalenin özetini (abstract), herkesin anlayabileceği, basit ve kısa bir paragrafa dönüştür.
        4.  Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
    `;
    // 3. ADIM: Gemini API'sine isteği hazırla ve gönder
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
              "type": "STRING"
            },
            "summary": {
              "type": "STRING",
              "description": "Makalenin basitleştirilmiş özeti."
            },
            "authors": {
              "type": "ARRAY",
              "items": {
                "type": "STRING"
              }
            },
            "publication_platform": {
              "type": "STRING"
            },
            "pdf_url": {
              "type": "STRING"
            }
          },
          required: [
            "title",
            "summary",
            "authors",
            "publication_platform",
            "pdf_url"
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
    const paperData = JSON.parse(result.candidates[0].content.parts[0].text);
    // 4. ADIM: Bulunan akademik makaleyi, "Akademik Makale" tipinde bir 'post' olarak veritabanına kaydet
    const { data: newPost, error: insertError } = await supabaseAdmin.from('posts').insert({
      title: paperData.title,
      content: paperData.summary,
      description: `"${tool.name}" aracının arkasındaki bilimsel makalenin özeti.`,
      status: 'Yayınlandı',
      type: 'Akademik Makale',
      pdf_url: paperData.pdf_url,
      publication_platform: paperData.publication_platform,
      authors: paperData.authors
    }).select('id').single();
    if (insertError) throw insertError;
    // 5. ADIM: Yeni oluşturulan bu makaleyi, ilgili araca bağla
    await supabaseAdmin.from('post_tools').insert({
      post_id: newPost.id,
      tool_id: tool.id
    });
    return new Response(JSON.stringify({
      message: `"${tool.name}" aracı için akademik makale bulundu ve eklendi.`
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
