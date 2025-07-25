import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
function createEmailHtml(username, aiAnalysis, digestData) {
  // Bu, e-posta istemcileriyle uyumlu olması için inline CSS kullanır.
  return `
    <!DOCTYPE html><html><body style="font-family: sans-serif; color: #333;">
      <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 24px;">
        <h1 style="font-size: 24px;">Merhaba ${username}, İşte Bu Haftaki AI Raporun!</h1>
        <p style="color: #666;">${aiAnalysis.weekly_summary}</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <h2 style="font-size: 18px;">✨ Sana Özel Öneri</h2>
        <p style="color: #666;">${aiAnalysis.special_suggestion}</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <h2 style="font-size: 18px;">📈 Haftalık Aktivitelerin</h2>
        <ul>
          <li><strong>Yeni Prompt'ların:</strong> ${digestData.user_activity.new_prompts_count}</li>
          <li><strong>Yeni Eserlerin:</strong> ${digestData.user_activity.new_showcases_count}</li>
          <li><strong>Kazandığın Puan:</strong> ${digestData.user_activity.reputation_earned_weekly}</li>
          <li><strong>İçeriklerin Yeni Oy Aldı:</strong> ${digestData.content_performance.new_prompt_votes + digestData.content_performance.new_showcase_votes} kez</li>
        </ul>
        <p style="font-size: 12px; color: #999; margin-top: 30px;">Bu e-postayı AI Keşif Platformu'ndan aldınız.</p>
      </div>
    </body></html>
    `;
}
// Bu ana fonksiyon, Edge Function çağrıldığında çalışır
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY bulunamadı.");
    // 1. ADIM: Haftalık rapor almak isteyen tüm kullanıcıları çek
    const { data: users, error: usersError } = await supabaseAdmin.from("profiles").select("id, email, username").eq("wants_weekly_digest", true);
    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({
        message: "Rapor gönderilecek kullanıcı bulunmuyor."
      }), {
        headers: {
          ...corsHeaders
        }
      });
    }
    const emailBatch = [];
    // 2. ADIM: Her bir kullanıcı için kişiselleştirilmiş rapor oluştur
    for (const user of users){
      // a. Kullanıcının haftalık verilerini çek
      const { data: digestData, error: digestError } = await supabaseAdmin.rpc("get_user_weekly_digest_data", {
        p_user_id: user.id
      });
      if (digestError || !digestData) continue; // Bir kullanıcı için hata olursa, diğerlerine devam et
      // b. Gemini için özel prompt'u oluştur
      const prompt = `
        Sen bir topluluk yöneticisisin. Bir kullanıcıya, platformdaki haftalık aktivitelerini özetleyen ve ona özel bir tavsiye veren kişisel bir e-posta metni yazacaksın. Metin samimi ve motive edici olmalı.
        KULLANICI VERİLERİ: ${JSON.stringify(digestData)}
        Cevabını SADECE aşağıdaki JSON formatında ver.
      `;
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              weekly_summary: {
                type: "STRING",
                description: "Kullanıcının haftalık aktivitelerini özetleyen 1-2 cümlelik samimi bir metin."
              },
              special_suggestion: {
                type: "STRING",
                description: "Kullanıcının verilerine dayanarak, platformda ilgisini çekebilecek kişisel bir öneri."
              }
            },
            required: [
              "weekly_summary",
              "special_suggestion"
            ]
          }
        }
      };
      // c. Gemini'den kişiselleştirilmiş metni al
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) continue;
      const result = await response.json();
      const aiAnalysis = JSON.parse(result.candidates[0].content.parts[0].text);
      // d. E-posta'yı oluştur ve toplu gönderim için listeye ekle
      const htmlBody = createEmailHtml(user.username || user.email, aiAnalysis, digestData);
      emailBatch.push({
        from: Deno.env.get("ADMIN_NOTIF_EMAIL_FROM") ?? "onboarding@resend.dev",
        to: user.email,
        subject: `${user.username || "Merhaba"}, İşte Bu Haftaki AI Raporun!`,
        html: htmlBody
      });
    }
    // 3. ADIM: Oluşturulan tüm kişiselleştirilmiş e-postaları toplu olarak gönder
    if (emailBatch.length > 0) {
      for (const email of emailBatch){
        await resend.emails.send(email);
      }
    }
    return new Response(JSON.stringify({
      message: `${emailBatch.length} kişiselleştirilmiş rapor başarıyla gönderildi.`
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error)
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 400
    });
  }
});
