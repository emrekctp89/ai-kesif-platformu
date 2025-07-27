// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
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

    // 1. ADIM: Aktif olan tüm görevleri veritabanından çek
    const { data: allQuests, error: questsError } = await supabaseAdmin
      .from('quests')
      .select('*')
      .eq('is_active', true);
    if (questsError) throw questsError;
    if (!allQuests || allQuests.length < 3) {
      throw new Error("Yeterli sayıda aktif görev bulunmuyor (en az 3 tane olmalı).");
    }

    // 2. ADIM: Tüm kullanıcıları çek
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, daily_streak');
    if (usersError) throw usersError;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 864e5).toISOString().split('T')[0];

    // 3. ADIM: Her bir kullanıcı için görevleri ata ve seriyi kontrol et
    for (const user of users) {
      // a. Dünün görevlerinin tamamlanıp tamamlanmadığını kontrol et
      const { data: yesterdayQuests, error: _yesterdayError } = await supabaseAdmin
        .from('user_daily_quests')
        .select('is_completed')
        .eq('user_id', user.id)
        .eq('quest_date', yesterday);
      
      let completedYesterday = false;
      if (yesterdayQuests && yesterdayQuests.length > 0) {
        completedYesterday = yesterdayQuests.every(q => q.is_completed);
      }

      // b. Seriyi güncelle
      let newStreak = user.daily_streak;
      if (completedYesterday) {
        newStreak++; // Eğer dün tamamladıysa, seriyi artır
      } else {
        newStreak = 0; // Eğer tamamlamadıysa, seriyi sıfırla
      }
      
      await supabaseAdmin
        .from('profiles')
        .update({ daily_streak: newStreak })
        .eq('id', user.id);

      // c. Bugün için 3 adet rastgele görev seç
      const _userQuests = [];
      const shuffledQuests = [...allQuests].sort(() => 0.5 - Math.random());
      const selectedQuests = shuffledQuests.slice(0, 3);

      // d. Seçilen görevleri kullanıcıya ata
      const questsToInsert = selectedQuests.map(quest => ({
        user_id: user.id,
        quest_id: quest.id,
        quest_date: today,
        current_progress: 0,
        is_completed: false
      }));

      await supabaseAdmin.from('user_daily_quests').insert(questsToInsert);
    }
    
    return new Response(
      JSON.stringify({ message: `${users.length} kullanıcı için günlük görevler başarıyla atandı.` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

//import "jsr:@supabase/functions-js/edge-runtime.d.ts"

//console.log("Hello from Functions!")

//Deno.serve(async (req) => {
//  const { name } = await req.json()
 // const data = {
  //  message: `Hello ${name}!`,
 // }

//  return new Response(
//    JSON.stringify(data),
//    { headers: { "Content-Type": "application/json" } },
//  )
// })

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/quest-assigner' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
