import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // CORS ayarları için
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Admin yetkilerine sahip bir Supabase istemcisi oluşturuyoruz
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Resend istemcisini API anahtarımızla başlatıyoruz
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // 1. Durumu 'pending' olan tüm e-postaları kuyruktan çekiyoruz
    const { data: pendingEmails, error: fetchError } = await supabaseAdmin
      .from("email_queue")
      .select("*")
      .eq("status", "pending");

    if (fetchError) throw fetchError;

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: "Gönderilecek e-posta bulunmuyor." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Her bir e-postayı göndermek için Resend'in toplu gönderme (batch) özelliğini kullanıyoruz
    const emailBatch = pendingEmails.map((email) => ({
      from: Deno.env.get("ADMIN_NOTIF_EMAIL_FROM") ?? "onboarding@resend.dev",
      to: email.recipient,
      subject: email.subject,
      html: email.html_body,
    }));

    const { data, error: sendError } = await resend.emails.send(emailBatch);

    if (sendError) {
      // Eğer toplu gönderme başarısız olursa, tek tek göndermeyi deneyebiliriz
      // veya hatayı loglayıp çıkabiliriz. Şimdilik hatayı fırlatıyoruz.
      throw sendError;
    }

    // 3. Başarıyla gönderilen e-postaların ID'lerini topluyoruz
    const sentEmailIds = data
      .map((result, index) => {
        // Resend'in batch yanıtı 'id' içerir
        if (result.id) {
          return pendingEmails[index].id;
        }
        return null;
      })
      .filter((id) => id !== null);

    // 4. Gönderilen e-postaların durumunu 'sent' olarak güncelliyoruz
    if (sentEmailIds.length > 0) {
      await supabaseAdmin
        .from("email_queue")
        .update({ status: "sent", updated_at: new Date().toISOString() })
        .in("id", sentEmailIds);
    }

    return new Response(
      JSON.stringify({
        message: `${sentEmailIds.length} e-posta başarıyla gönderildi.`,
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
