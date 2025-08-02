import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error("GEMINI_API_KEY bulunamadı.");

    console.log("1. ADIM: İşlenmiş araçların ID'leri çekiliyor...");
    // a. Önce, zaten bir makale ile ilişkilendirilmiş olan araçların ID'lerini alıyoruz.
    const { data: processedTools, error: processedError } = await supabaseAdmin
      .from('post_tools')
      .select('tool_id');
    
    if (processedError) throw new Error(`İşlenmiş araçlar çekilirken hata: ${processedError.message}`);
    
    const processedToolIds = processedTools.map(item => item.tool_id);

    console.log("2. ADIM: İşlenecek yeni araç aranıyor...");
    // b. Şimdi, bu ID'lerin DIŞINDA kalan, onaylanmış bir araç arıyoruz.
    let query = supabaseAdmin
      .from('tools')
      .select('id, name, description')
      .eq('is_approved', true)
      .limit(1);

    if (processedToolIds.length > 0) {
      query = query.not('id', 'in', `(${processedToolIds.join(',')})`);
    }

    const { data: tools, error: fetchError } = await query;

    if (fetchError) throw new Error(`Araçları çekerken veritabanı hatası: ${fetchError.message}`);

    if (!tools || tools.length === 0) {
      console.log("-> İşlenecek yeni araç bulunamadı.");
      return new Response(JSON.stringify({ message: "İşlenecek yeni araç bulunmuyor." }), { headers: { ...corsHeaders } });
    }

    const tool = tools[0];
    console.log(`-> Araç bulundu: #${tool.id} - ${tool.name}`);
    
    // 3. ADIM: Gemini API'sine istek gönderiliyor...
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { /* ... (payload içeriği aynı, değişiklik yok) ... */ };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("!!! Gemini API Hatası:", errorBody);
        throw new Error(`Gemini API Hatası: ${errorBody}`);
    }

    const result = await response.json();
    const paperData = JSON.parse(result.candidates[0].content.parts[0].text);
    console.log("-> Gemini'den makale verisi başarıyla alındı:", paperData.title);

    // 4. ADIM: Makale veritabanına kaydediliyor...
    const { data: newPost, error: insertError } = await supabaseAdmin
      .from('posts')
      .insert({
        title: paperData.title,
        content: paperData.summary,
        description: `"${tool.name}" aracının arkasındaki bilimsel makalenin özeti.`,
        status: 'Yayınlandı',
        type: 'Akademik Makale',
        pdf_url: paperData.pdf_url,
        publication_platform: paperData.publication_platform,
        authors: paperData.authors,
      })
      .select('id')
      .single();

    if (insertError) throw new Error(`Yeni makale kaydedilirken hata: ${insertError.message}`);
    console.log(`-> Yeni makale başarıyla oluşturuldu: ID #${newPost.id}`);

    // 5. ADIM: Makale ve araç birbirine bağlanıyor...
    await supabaseAdmin
      .from('post_tools')
      .insert({ post_id: newPost.id, tool_id: tool.id });
    console.log("-> Makale ve araç başarıyla bağlandı. İşlem tamamlandı.");
    
       return new Response(
      JSON.stringify({ message: `"${tool.name}" aracı için akademik makale bulundu ve eklendi.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("!!! 'academic-scout' fonksiyonunda nihai hata:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
