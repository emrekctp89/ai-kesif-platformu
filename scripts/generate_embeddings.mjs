import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
  console.error('Error: Missing required environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getEmbedding(text) {
  const payload = {
    model: 'models/text-embedding-004',
    content: { parts: [{ text }] },
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Embedding API Hatası: ${result.error?.message || 'Bilinmeyen hata'}`);
  }

  if (result.embedding?.values) {
    return result.embedding.values;
  }
  throw new Error('Vektör alınamadı.');
}

async function run() {
  console.log('Fetching tools without embeddings...');
  
  // Get all approved tools that don't have embeddings (or just all tools to refresh them)
  const { data: tools, error } = await supabase
    .from('tools')
    .select('id, name, description')
    .eq('is_approved', true)
    // .is('embedding', null); // Optionally filter only null ones

  if (error) {
    console.error('Error fetching tools:', error);
    process.exit(1);
  }

  console.log(`Found ${tools.length} tools to process.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    console.log(`[${i + 1}/${tools.length}] Generating embedding for: ${tool.name}...`);
    
    try {
      const textToEmbed = `${tool.name}. ${tool.description || ''}`;
      const embedding = await getEmbedding(textToEmbed);
      
      const { error: updateError } = await supabase
        .from('tools')
        .update({ embedding: `[${embedding.join(',')}]` })
        .eq('id', tool.id);
        
      if (updateError) {
        console.error(`  -> Database update failed for ${tool.name}:`, updateError.message);
        failCount++;
      } else {
        console.log(`  -> Success!`);
        successCount++;
      }
      
      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (err) {
      console.error(`  -> Embedding failed for ${tool.name}:`, err.message);
      failCount++;
    }
  }

  console.log(`\nCompleted! Success: ${successCount}, Failed: ${failCount}`);
}

run();
