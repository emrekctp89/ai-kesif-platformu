import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
const GEMINI_EMBEDDING_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY bulunamadı.");
    console.log("1. Dizinlenecek yeni araçlar aranıyor...");
    const { data: tools, error: fetchError } = await supabaseAdmin.from("tools").select("id, name, description").eq("is_approved", true).is("embedding", null);
    if (fetchError) throw fetchError;
    if (!tools || tools.length === 0) {
      console.log("-> Dizinlenecek yeni araç bulunamadı. İşlem tamamlandı.");
      return new Response(JSON.stringify({
        message: "Dizinlenecek yeni araç bulunmuyor."
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log(`-> ${tools.length} adet yeni araç bulundu. Vektörler oluşturuluyor...`);
    let successCount = 0;
    for (const tool of tools){
      try {
        const textToEmbed = `${tool.name}: ${tool.description}`;
        console.log(`-- Araç #${tool.id} işleniyor: "${tool.name}"`);
        const payload = {
          model: "models/text-embedding-004",
          content: {
            parts: [
              {
                text: textToEmbed
              }
            ]
          }
        };
        const response = await fetch(`${GEMINI_EMBEDDING_API_URL}?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const errorBody = await response.json();
          console.error(`-- HATA: Araç #${tool.id} için embedding oluşturulamadı. API Cevabı:`, errorBody);
          continue;
        }
        const result = await response.json();
        const embedding = result.embedding.value;
        await supabaseAdmin.from("tools").update({
          embedding: embedding
        }).eq("id", tool.id);
        console.log(`-- ✅ Araç #${tool.id} başarıyla dizinlendi.`);
        successCount++;
      } catch (innerError) {
        if (innerError instanceof Error) {
          console.error(`-- HATA: Araç #${tool.id} işlenirken bir istisna oluştu:`, innerError.message);
        } else {
          console.error(`-- HATA: Araç #${tool.id} işlenirken bilinmeyen bir hata oluştu:`, String(innerError));
        }
      }
    }
    const finalMessage = `${successCount} / ${tools.length} adet aracın anlamsal dizini başarıyla oluşturuldu.`;
    console.log(`3. İşlem tamamlandı. Sonuç: ${finalMessage}`);
    return new Response(JSON.stringify({
      message: finalMessage
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("!!! Ana Fonksiyon Hatası:", error.message);
      return new Response(JSON.stringify({
        error: error.message
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 400
      });
    } else {
      console.error("!!! Ana Fonksiyon Hatası:", String(error));
      return new Response(JSON.stringify({
        error: String(error)
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 400
      });
    }
  }
});
