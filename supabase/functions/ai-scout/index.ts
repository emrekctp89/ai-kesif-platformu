import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

// Bu fonksiyon, belirli bir web sayfasını tarar ve yeni AI araçlarını bulur
async function scrapeForNewTools(supabase) {
  // Product Hunt'ın AI kategorisini hedefliyoruz.
  const targetUrl =
    "https://www.producthunt.com/topics/artificial-intelligence";

  // Sayfanın HTML içeriğini çekiyoruz
  const response = await fetch(targetUrl);
  const html = await response.text();

  // Deno DOM ile HTML'i ayrıştırıyoruz
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) {
    throw new Error("Sayfa ayrıştırılamadı.");
  }

  const scrapedTools = [];
  // Product Hunt'taki her bir ürün kartını seçiyoruz.
  // Not: Bu seçici (selector) Product Hunt'ın tasarımına bağlıdır ve gelecekte değişebilir.
  const productElements = doc.querySelectorAll('a[data-test^="product-item"]');

  for (const element of productElements) {
    const nameElement = element.querySelector(
      "div > div:nth-child(2) > div:nth-child(1) > strong"
    );
    const descriptionElement = element.querySelector(
      "div > div:nth-child(2) > div:nth-child(2)"
    );

    if (nameElement && descriptionElement) {
      const name = nameElement.textContent.trim();
      const description = descriptionElement.textContent.trim();
      const link = "https://www.producthunt.com" + element.getAttribute("href");

      scrapedTools.push({ name, description, link });
    }
  }

  // Veritabanındaki mevcut tüm araçların linklerini alıyoruz
  const { data: existingTools } = await supabase.from("tools").select("link");

  const existingLinks = new Set(existingTools.map((t) => t.link));

  // Sadece veritabanımızda henüz olmayan yeni araçları buluyoruz
  const newToolsToInsert = scrapedTools.filter(
    (tool) => !existingLinks.has(tool.link)
  );

  // Eğer yeni araç varsa, veritabanına ekle
  if (newToolsToInsert.length > 0) {
    const toolsWithSlug = newToolsToInsert.map((tool) => ({
      name: tool.name,
      description: tool.description,
      link: tool.link,
      // Basit bir slug oluşturuyoruz (daha gelişmiş bir fonksiyon kullanılabilir)
      slug: tool.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
      is_approved: false, // Onay bekliyor olarak eklenir
      suggester_email: "ai-scout-bot@aikesif.com", // Önerenin bot olduğunu belirtiyoruz
    }));

    await supabase.from("tools").insert(toolsWithSlug);
  }

  return newToolsToInsert.length;
}

// Bu ana fonksiyon, Edge Function çağrıldığında çalışır
serve(async (req) => {
  // CORS ayarları için (farklı domainlerden çağrılmasına izin verir)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Admin yetkilerine sahip bir Supabase istemcisi oluşturuyoruz
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Web scraping işlemini başlatıyoruz
    const newToolsCount = await scrapeForNewTools(supabaseAdmin);

    // Sonucu döndürüyoruz
    return new Response(
      JSON.stringify({
        message: `${newToolsCount} yeni araç bulundu ve onaya eklendi.`,
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
