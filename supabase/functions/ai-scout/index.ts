import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.53/deno-dom-wasm.ts";
//async function scrapeForNewTools(supabase: ReturnType<typeof createClient>) {
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

async function scrapeForNewTools(supabase: SupabaseClient<any, "public", any>) {
  const targetUrl = "https://www.producthunt.com/topics/artificial-intelligence";
  const response = await fetch(targetUrl);
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) throw new Error("Sayfa ayrıştırılamadı.");
  const scrapedTools = [];
  const productElements = doc.querySelectorAll('a[data-test^="product-item"]');
  for (const element of productElements){
    const nameElement = element.querySelector("div > div:nth-child(2) > div:nth-child(1) > strong");
    const descriptionElement = element.querySelector("div > div:nth-child(2) > div:nth-child(2)");
    if (nameElement && descriptionElement) {
      const name = nameElement.textContent.trim();
      const description = descriptionElement.textContent.trim();
      const href = element.getAttribute("href") ?? "";
      const link = "https://www.producthunt.com" + href;
      scrapedTools.push({
        name,
        description,
        link
      });
    }
  }
  const { data: existingTools, error } = await supabase.from("tools").select("link");
  if (error) throw error;
  const existingLinks = new Set(existingTools?.map((t)=>t.link) ?? []);
  const newToolsToInsert = scrapedTools.filter((tool)=>!existingLinks.has(tool.link));
  if (newToolsToInsert.length > 0) {
    const toolsWithSlug = newToolsToInsert.map((tool)=>({
        name: tool.name,
        description: tool.description,
        link: tool.link,
        slug: tool.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        is_approved: false,
        suggester_email: "ai-scout-bot@aikesif.com"
      }));
    await supabase.from("tools").insert(toolsWithSlug);
  }
  return newToolsToInsert.length;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const newToolsCount = await scrapeForNewTools(supabaseAdmin);
    if (newToolsCount === 0) {
      return new Response(JSON.stringify({
        message: "Yeni araç bulunamadı."
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    return new Response(JSON.stringify({
      message: `${newToolsCount} yeni araç bulundu ve onaya eklendi.`
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: (error instanceof Error ? error.message : "Bilinmeyen hata")
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 400
    });
  }
});
