import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Bu ana fonksiyon, Edge Function çağrıldığında çalışır
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. ADIM: Aynı linke sahip olan araç gruplarını bul
    const { data: duplicateGroups, error: queryError } = await supabaseAdmin
      .from('tools')
      .select('link, ids:id, names:name')
      .in('id', (await supabaseAdmin.from('tools').select('id').gt('link', ''))) // link'i boş olmayanları al
      .rpc('group_by_link'); // Bu bir varsayımsal RPC, gerçek sorgu aşağıda

    // Gerçek sorgu:
     const { data: duplicateToolsByLink, error: linkError } = await supabaseAdmin
        .from('tools')
        .select('link, id, name')
        .in('link', (
            await supabaseAdmin.from('tools').select('link').gt('link', '').groupBy('link').having('count', '>', 1).then(res => res.data.map(r => r.link))
        ));

    if (linkError) throw linkError;
    
    const groupedByLink = duplicateToolsByLink.reduce((acc, tool) => {
        acc[tool.link] = acc[tool.link] || [];
        acc[tool.link].push(tool);
        return acc;
    }, {});


    let newAlertsCount = 0;

    // 2. ADIM: Her bir mükerrer grup için bir uyarı oluştur
    for (const link in groupedByLink) {
      const tools = groupedByLink[link];
      const toolIds = tools.map(t => t.id);
      const toolNames = tools.map(t => t.name).join(', ');

      // Bu araç ID'leri için daha önce bir uyarı oluşturulmuş mu diye kontrol et
      const { data: existingAlert, error: checkError } = await supabaseAdmin
        .from('admin_alerts')
        .select('id')
        .eq('alert_type', 'mükerrer_araç')
        .contains('related_content', { tool_ids: toolIds })
        .maybeSingle();

      if (checkError) throw checkError;

      // Eğer daha önce uyarı oluşturulmamışsa, yeni bir tane oluştur
      if (!existingAlert) {
        const description = `Bu araçlar aynı web sitesi linkini paylaşıyor: ${toolNames}.`;
        const related_content = { tool_ids: toolIds };

        const { error: insertError } = await supabaseAdmin
          .from('admin_alerts')
          .insert({
            alert_type: 'mükerrer_araç',
            description: description,
            related_content: related_content,
            status: 'Yeni'
          });

        if (insertError) throw insertError;
        newAlertsCount++;
      }
    }
    
    return new Response(
      JSON.stringify({ message: `${newAlertsCount} yeni mükerrer araç uyarısı oluşturuldu.` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
