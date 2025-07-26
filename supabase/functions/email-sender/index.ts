// Deno Edge Function örneği:
import { createClient } from "npm:@supabase/supabase-js";
import { Resend } from "npm:resend";
const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Method not allowed"
    }), {
      status: 405,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  try {
    const { data: pendingEmails, error: fetchError } = await supabaseAdmin.from("email_queue").select("*").eq("status", "pending");
    if (fetchError) throw fetchError;
    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({
        message: "Gönderilecek e-posta bulunmuyor."
      }), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const sentEmailIds = [];
    for (const email of pendingEmails){
      const { data, error } = await resend.emails.send({
        from: Deno.env.get("ADMIN_NOTIF_EMAIL_FROM") ?? "onboarding@resend.dev",
        to: email.recipient,
        subject: email.subject,
        html: email.html_body
      });
      if (error) throw error;
      if (data?.id) sentEmailIds.push(email.id);
    }
    if (sentEmailIds.length > 0) {
      await supabaseAdmin.from("email_queue").update({
        status: "sent",
        updated_at: new Date().toISOString()
      }).in("id", sentEmailIds);
    }
    return new Response(JSON.stringify({
      message: `${sentEmailIds.length} e-posta başarıyla gönderildi.`
    }), {
      headers: {
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    let errorMessage = "Bilinmeyen hata";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      headers: {
        "Content-Type": "application/json"
      },
      status: 400
    });
  }
}
