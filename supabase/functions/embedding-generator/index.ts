import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_EMBEDDING_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

// Bir metni, Gemini kullanarak anlamsal bir vektöre dönüştüren yardımcı fonksiyon
async function getEmbedding(text: string, apiKey: string) {
  if (!text) return null;
  const payload = {
    model: "models/text-embedding-004",
    content: { parts: [{ text }] }
  };
  const response = await fetch(`${GEMINI_EMBEDDING_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    console.error(`Embedding API Hatası: ${text.substring(0, 50)}...`);
    return null;
  }
  const result = await response.json();
  return result.embedding?.value;
}

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
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error("GEMINI_API_KEY bulunamadı.");

    let totalIndexedCount = 0;

    // 1. ADIM: Yeni ARAÇLARI dizinle
    const { data: tools } = await supabaseAdmin.rpc('get_unindexed_content', { p_table_name: 'tools' });
    if (tools) {
      for (const item of tools) {
        const textToEmbed = `${item.title}: ${item.description}`;
        const embedding = await getEmbedding(textToEmbed, apiKey);
        if (embedding) {
          await supabaseAdmin.from('embeddings').insert({
            related_table: 'tools',
            related_id: item.id,
            embedding: embedding,
            title: item.title,
            description: item.description,
            url: `/tool/${item.slug}`
          });
          totalIndexedCount++;
        }
      }
    }

    // 2. ADIM: Yeni BLOG YAZILARINI dizinle
    const { data: posts } = await supabaseAdmin.rpc('get_unindexed_content', { p_table_name: 'posts' });
     if (posts) {
      for (const item of posts) {
        const textToEmbed = `${item.title}: ${item.description}`;
        const embedding = await getEmbedding(textToEmbed, apiKey);
        if (embedding) {
          await supabaseAdmin.from('embeddings').insert({
            related_table: 'posts',
            related_id: item.id,
            embedding: embedding,
            title: item.title,
            description: item.description,
            url: `/blog/${item.slug}`
          });
          totalIndexedCount++;
        }
      }
    }

    // 3. ADIM: Yeni KOLEKSİYONLARI dizinle
    const { data: collections } = await supabaseAdmin.rpc('get_unindexed_content', { p_table_name: 'collections' });
     if (collections) {
      for (const item of collections) {
        const textToEmbed = `${item.title}: ${item.description}`;
        const embedding = await getEmbedding(textToEmbed, apiKey);
        if (embedding) {
          await supabaseAdmin.from('embeddings').insert({
            related_table: 'collections',
            related_id: item.id,
            embedding: embedding,
            title: item.title,
            description: item.description,
            url: `/koleksiyonlar/${item.slug}`
          });
          totalIndexedCount++;
        }
      }
    }
    
    return new Response(
      JSON.stringify({ message: `${totalIndexedCount} adet yeni içeriğin anlamsal dizini başarıyla oluşturuldu.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
