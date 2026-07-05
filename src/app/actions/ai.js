'use server';

import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { enforceRateLimit } from '@/utils/antiAbuse';
import * as cheerio from 'cheerio';

const GEMINI_EMBEDDING_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

export async function getEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY bulunamadı.');

  const payload = {
    model: 'models/text-embedding-004',
    content: { parts: [{ text }] },
  };

  const response = await fetch(`${GEMINI_EMBEDDING_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('Gemini Embedding API Hatası:', JSON.stringify(result, null, 2));
    const errorMessage = result.error?.message || 'Bilinmeyen bir API hatası.';
    throw new Error(`Embedding API Hatası: ${errorMessage}`);
  }

  if (result.embedding?.values) {
    return result.embedding.values;
  } else {
    const finishReason = result.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') {
      throw new Error('İsteğiniz güvenlik politikalarını ihlal ettiği için işlenemedi.');
    }
    console.error('Beklenmedik API Cevabı:', JSON.stringify(result, null, 2));
    throw new Error(
      "API'den geçerli bir embedding vektörü alınamadı. Lütfen API yapılandırmanızı (faturalandırma, aktif API'ler) kontrol edin."
    );
  }
}

async function getAllToolsForAI() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tools')
    .select('name, slug, description')
    .eq('is_approved', true);

  if (error) {
    console.error('AI için araçlar çekilirken hata:', error);
    return [];
  }
  return data;
}

export async function getAiRecommendation(userPrompt) {
  'use server';

  const rateLimit = await enforceRateLimit('ai-recommendation', {
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Çok sık tavsiye istediniz. ${rateLimit.retryAfterSeconds} saniye sonra tekrar deneyin.`,
    };
  }

  const normalizedPrompt = String(userPrompt || '').trim();

  if (normalizedPrompt.length < 10) {
    return {
      success: false,
      error: 'İhtiyacınızı en az 10 karakterle anlatın.',
    };
  }

  if (normalizedPrompt.length > 800) {
    return {
      success: false,
      error: 'İsteğiniz en fazla 800 karakter olabilir.',
    };
  }

  try {
    // 1. Kullanıcı isteğinin vektörünü (embedding) çıkar
    const promptEmbedding = await getEmbedding(normalizedPrompt);
    const embeddingString = `[${promptEmbedding.join(',')}]`;

    // 2. Vektör araması ile en uygun 10 aracı bul (RAG)
    const supabase = createClient();
    const { data: matchedTools, error: matchError } = await supabase.rpc('match_tools', {
      query_embedding: embeddingString,
      match_threshold: 0.1, // Düşük bir eşik, Gemini eleme yapacak
      match_count: 10,
    });

    if (matchError) {
      console.error('Vektör arama hatası:', matchError);
      return { success: false, error: 'Tavsiye motoru veritabanına erişemedi.' };
    }

    if (!matchedTools || matchedTools.length === 0) {
      return { success: false, error: 'İsteğinize uygun araç bulunamadı.' };
    }

    const formattedTools = matchedTools
      .map((t) => `- ${t.name} (${t.slug}): ${t.description}`)
      .join('\n');
    const prompt = `
          Bir "AI Araçları Keşif Platformu" için tavsiye motorusun. Kullanıcının isteğine göre, aşağıdaki listeden en uygun 3 aracı seçmelisin.
          
          Kullanıcının isteği: "${normalizedPrompt}"

          Mevcut Araç Listesi:
          ${formattedTools}

          Görevin: Kullanıcının isteğine en uygun 3 aracı seçmek ve her biri için neden uygun olduğunu TEK bir cümle ile açıklamaktır. Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin ekleme.
      `;

    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            recommendations: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  slug: { type: 'STRING' },
                  reason: { type: 'STRING' },
                },
                required: ['name', 'slug', 'reason'],
              },
            },
          },
        },
      },
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Gemini API anahtarı bulunamadı.' };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API Hatası:', errorBody);
      return {
        success: false,
        error: `Yapay zeka modelinden bir hata alındı. (Status: ${response.status})`,
      };
    }

    const result = await response.json();

    if (
      result.candidates &&
      result.candidates[0].content &&
      result.candidates[0].content.parts[0].text
    ) {
      const textResponse = result.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(textResponse);
      const toolsBySlug = new Map(allTools.map((tool) => [tool.slug, tool]));
      const recommendations = Array.isArray(parsedJson.recommendations)
        ? parsedJson.recommendations
            .filter(
              (recommendation) =>
                recommendation &&
                typeof recommendation.slug === 'string' &&
                typeof recommendation.reason === 'string' &&
                toolsBySlug.has(recommendation.slug)
            )
            .slice(0, 3)
            .map((recommendation) => ({
              name: toolsBySlug.get(recommendation.slug).name,
              slug: recommendation.slug,
              reason: recommendation.reason.trim().slice(0, 300),
            }))
        : [];

      if (recommendations.length === 0) {
        return {
          success: false,
          error: 'Bu ihtiyaç için doğrulanmış bir araç önerisi oluşturulamadı.',
        };
      }

      return { success: true, data: recommendations };
    } else {
      return {
        success: false,
        error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.',
      };
    }
  } catch (e) {
    console.error('Tavsiye fonksiyonunda genel hata:', e);
    return {
      success: false,
      error: 'Tavsiye alınırken beklenmedik bir hata oluştu.',
    };
  }
}

export async function getAiComparison(tools) {
  'use server';

  if (!tools || tools.length < 2) {
    return { error: 'Lütfen karşılaştırmak için en az 2 araç seçin.' };
  }

  try {
    const formattedTools = tools
      .map(
        (t, i) =>
          `Araç ${i + 1}:\n- Adı: ${t.name}\n- Açıklaması: ${t.description}\n- Fiyatlandırma: ${t.pricing_model || 'Belirtilmemiş'}\n- Puanı: ${t.average_rating.toFixed(1)} (${t.total_ratings} oy)`
      )
      .join('\n\n');

    const prompt = `
        Sen bir AI ürünleri konusunda uzman bir teknoloji analistisin. Sana verilen iki veya daha fazla yapay zeka aracını objektif bir şekilde karşılaştırman gerekiyor.
        
        Karşılaştırılacak Araçlar:
        ${formattedTools}

        Görevin: Bu araçları analiz ederek, hangisinin hangi tür kullanıcılar için daha uygun olduğunu, güçlü ve zayıf yönlerini belirten bir analiz yazısı yazmaktır. Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
    `;

    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            comparison_summary: { type: 'STRING' },
            detailed_analysis: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  tool_name: { type: 'STRING' },
                  best_for: { type: 'STRING' },
                  pros: { type: 'ARRAY', items: { type: 'STRING' } },
                  cons: { type: 'ARRAY', items: { type: 'STRING' } },
                },
                required: ['tool_name', 'best_for', 'pros', 'cons'],
              },
            },
          },
        },
      },
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: 'Gemini API anahtarı bulunamadı.' };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini Karşılaştırma Hatası:', errorBody);
      return { error: `Yapay zeka modelinden hata alındı.` };
    }

    const result = await response.json();

    if (
      result.candidates &&
      result.candidates[0].content &&
      result.candidates[0].content.parts[0].text
    ) {
      const textResponse = result.candidates[0].content.parts[0].text;
      return { success: true, data: JSON.parse(textResponse) };
    } else {
      return {
        error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.',
      };
    }
  } catch (e) {
    console.error('Karşılaştırma fonksiyonunda genel hata:', e);
    return { error: 'Analiz oluşturulurken beklenmedik bir hata oluştu.' };
  }
}

export async function generateTextWithGemini(userPrompt) {
  'use server';

  if (!userPrompt) {
    return { error: 'Lütfen bir istek girin.' };
  }

  try {
    const prompt = `Kullanıcının isteği: "${userPrompt}". Bu isteğe uygun, yaratıcı ve ilgi çekici bir metin oluştur.`;
    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return { error: 'Gemini API anahtarı bulunamadı.' };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { error: 'Yapay zeka modelinden hata alındı.' };
    }
    const result = await response.json();

    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return {
        success: true,
        text: result.candidates[0].content.parts[0].text,
      };
    } else {
      return {
        error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.',
      };
    }
  } catch (e) {
    console.error('Metin üretme hatası:', e);
    return { error: 'Metin üretilirken beklenmedik bir hata oluştu.' };
  }
}

export async function generateImageWithImagen(userPrompt) {
  'use server';

  if (!userPrompt) {
    return { error: 'Lütfen bir görsel tarifi girin.' };
  }

  try {
    const payload = {
      instances: [{ prompt: userPrompt }],
      parameters: { sampleCount: 1 },
    };
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return { error: 'Gemini/Imagen API anahtarı bulunamadı.' };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Imagen API Hatası:', errorBody);
      const errorMessage =
        errorBody.error?.message || 'Görsel üretme servisinden bilinmeyen bir hata alındı.';
      return { error: `Hata: ${errorMessage}` };
    }
    const result = await response.json();

    if (result.predictions?.[0]?.bytesBase64Encoded) {
      const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
      return { success: true, url: imageUrl };
    } else {
      return { error: 'Yapay zeka modelinden bir görsel alınamadı.' };
    }
  } catch (e) {
    console.error('Görsel üretme hatası:', e);
    return { error: 'Görsel üretilirken beklenmedik bir hata oluştu.' };
  }
}

export async function getAdminCoPilotResponse(userPrompt, history) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Bu özelliği kullanmak için yetkiniz yok.' };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { data: snapshotData } = await supabaseAdmin.rpc('get_platform_snapshot');
    if (!snapshotData) throw new Error('Platform verileri alınamadı.');

    const platformContext = `
        PLATFORM TEKNOLOJİLERİ:
        - Framework: Next.js (App Router)
        - Dil: JavaScript, React
        - Veritabanı: Supabase (PostgreSQL)
        - Stil: Tailwind CSS
        - UI Kütüphanesi: shadcn/ui
        - Sunucu Mantığı: Server Actions (src/app/actions.js içinde)
        - Veri Çekme: Sunucu bileşenleri veya Server Action'lar içinden Supabase istemcisi ile.

        PLATFORMUN ANLIK DURUMU:
        - Toplam Kullanıcı: ${snapshotData.totals.total_users}, Toplam Araç: ${snapshotData.totals.total_tools}
    `;

    const chatHistory = history.map((msg) => {
      let contentText = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: contentText }],
      };
    });

    const finalSystemPrompt = `
      Sen, 'AI Keşif Platformu' adlı projenin baş ürün yöneticisi ve baş geliştiricisisin. Sana platformun teknik yapısını, anlık verilerini ve önceki konuşmalarımızı sunuyorum. Görevin, tüm bu bağlamı kullanarak, adminin sorduğu son soruya yönelik en akıllı ve uygulanabilir cevabı vermektir. Eğer admin senden bir özellik için kod yazmanı isterse, bu teknolojilere uygun, tam ve çalıştırılabilir bir kod bloğu oluşturmalısın. Cevabını SADECE aşağıdaki JSON formatında ver.
    `;

    const finalUserMessage = {
      role: 'user',
      parts: [
        {
          text: `${finalSystemPrompt}\n\n${platformContext}\n\nADMİNİN YENİ SORUSU: "${userPrompt}"`,
        },
      ],
    };

    const payload = {
      contents: [...chatHistory, finalUserMessage],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            response_title: { type: 'STRING', description: 'Cevabına yaratıcı bir başlık bul.' },
            response_text: {
              type: 'STRING',
              description: 'Analizini veya açıklamanı metin olarak yaz.',
            },
            code_suggestion: {
              type: 'OBJECT',
              description: 'Eğer istendiyse, kod önerisi.',
              properties: {
                language: {
                  type: 'STRING',
                  description: 'Kodun dili (örn: javascript, jsx, sql).',
                },
                code: { type: 'STRING', description: 'Oluşturduğun tam kod.' },
                explanation: {
                  type: 'STRING',
                  description: 'Bu kodun ne işe yaradığını ve nasıl kullanılacağını kısaca açıkla.',
                },
              },
            },
          },
          required: ['response_title', 'response_text'],
        },
      },
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: 'Gemini API anahtarı bulunamadı.' };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      return { error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}` };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { success: true, data: JSON.parse(result.candidates[0].content.parts[0].text) };
    } else {
      return { error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.' };
    }
  } catch (e) {
    console.error('AI Co-Pilot fonksiyonunda genel hata:', e.message);
    return { error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}` };
  }
}

export async function runOmniSearch(query) {
  'use server';

  if (!query) {
    return [];
  }

  try {
    const supabase = createClient();

    const queryEmbedding = await getEmbedding(query);

    const { data, error } = await supabase.rpc('advanced_omni_search', {
      p_query_embedding: queryEmbedding,
      p_query_text: query,
    });

    if (error) {
      console.error('Gelişmiş Omni-search hatası:', error);
      return [];
    }

    const formattedData = data.map((item) => ({
      ...item,
      result_type:
        item.result_type.charAt(0).toUpperCase() + item.result_type.slice(1).replace('_', ' '),
    }));

    return formattedData;
  } catch (e) {
    console.error('runOmniSearch fonksiyonunda hata:', e.message);
    return [];
  }
}

export async function runAdvancedOmniSearch(query) {
  'use server';
  if (!query) return { results: [], suggestions: [], error: null };

  try {
    const supabase = createClient();
    const queryEmbedding = await getEmbedding(query);

    const { data: searchResults, error: rpcError } = await supabase.rpc('advanced_omni_search', {
      p_query_embedding: queryEmbedding,
      p_query_text: query,
    });
    if (rpcError) throw rpcError;

    const formatItem = (item) => ({
      ...item,
      result_type:
        item.result_type.charAt(0).toUpperCase() + item.result_type.slice(1).replace(/_/g, ' '),
    });

    if (searchResults && searchResults.length > 0) {
      return { results: searchResults.map(formatItem), suggestions: [], error: null };
    }

    const { data: suggestions, error: suggestionError } = await supabase.rpc(
      'get_popular_fallback_content'
    );
    if (suggestionError) throw suggestionError;

    return { results: [], suggestions: (suggestions || []).map(formatItem), error: null };
  } catch (e) {
    console.error('Gelişmiş Omni-Search hatası:', e.message);
    return { results: [], suggestions: [], error: e.message };
  }
}

export async function getAiCodeReview(codeToReview) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Bu özelliği kullanmak için yetkiniz yok.' };
  }

  if (!codeToReview || codeToReview.trim().length < 50) {
    return { error: 'Lütfen analiz etmek için anlamlı bir kod parçası girin.' };
  }

  try {
    const platformContext = `
        PROJENİN TEKNİK YAPISI:
        - Framework: Next.js (App Router)
        - Dil: JavaScript, React
        - Veritabanı: Supabase (PostgreSQL)
        - Stil: Tailwind CSS
        - UI Kütüphanesi: shadcn/ui
        - Sunucu Mantığı: Server Actions (src/app/actions.js içinde)
        - Veri Çekme: Sunucu bileşenleri veya Server Action'lar içinden Supabase istemcisi ile.
    `;

    const prompt = `
        Sen, bu projede çalışan, son derece deneyimli bir Senior Full-Stack Developer'sın. Görevin, sana verilen bir React bileşen kodunu, projenin teknik yapısını dikkate alarak analiz etmek ve iyileştirmektir.

        ${platformContext}

        ANALİZ EDİLECEK KOD:
        \`\`\`jsx
        ${codeToReview}
        \`\`\`

        YAPILACAKLAR:
        1.  Bu kodu performans, okunabilirlik, güvenlik ve en iyi pratikler açısından incele.
        2.  Bulduğun en önemli 3 iyileştirme potansiyelini listele.
        3.  Bu iyileştirmeleri uygulayarak, kodun tamamen yeniden yazılmış (refactored), daha modern ve daha sağlam halini oluştur.
        4.  Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
    `;

    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            analysis_title: {
              type: 'STRING',
              description: 'Kod incelemesine, içeriği yansıtan kısa bir başlık ver.',
            },
            suggestions: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Bulduğun en önemli 3 iyileştirme önerisini liste halinde sun.',
            },
            refactored_code: {
              type: 'STRING',
              description: 'Önerileri uygulayarak oluşturduğun, tam ve çalıştırılabilir yeni kod.',
            },
          },
          required: ['analysis_title', 'suggestions', 'refactored_code'],
        },
      },
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: 'Gemini API anahtarı bulunamadı.' };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      return {
        error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}`,
      };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return {
        success: true,
        data: JSON.parse(result.candidates[0].content.parts[0].text),
      };
    } else {
      return {
        error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.',
      };
    }
  } catch (e) {
    console.error('AI Kod İnceleme fonksiyonunda hata:', e.message);
    return {
      error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}`,
    };
  }
}

export async function generateToolsWithAi(formData, categories) {
  'use server';

  const supabaseAdmin = createAdminClient();
  const categoryId = formData.get('categoryId');
  const categoryName = formData.get('categoryName');

  if (!categoryId || !categoryName) {
    return { error: 'Lütfen bir kategori seçin.' };
  }

  try {
    const { data: existingTools } = await supabaseAdmin.from('tools').select('name, link');

    const existingNames = new Set(existingTools.map((t) => t.name.toLowerCase()));
    const existingLinks = new Set(existingTools.map((t) => t.link));

    const scrapeTools = async () => {
      const sources = [
        `https://www.futurepedia.io/tools?category=${encodeURIComponent(categoryName)}`,
        `https://theresanaiforthat.com/`,
        `https://www.producthunt.com/topics/ai`,
      ];

      const scrapedTools = [];

      for (const url of sources) {
        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const html = await res.text();
          const $ = cheerio.load(html);

          $('.tool-card').each((_, el) => {
            const name = $(el).find('.tool-name').text().trim();
            const link = $(el).find('a').attr('href');
            const description = $(el).find('.tool-description').text().trim();
            if (
              name &&
              link &&
              !existingNames.has(name.toLowerCase()) &&
              !existingLinks.has(link)
            ) {
              scrapedTools.push({ name, description, link });
            }
          });
        } catch {}
      }

      return scrapedTools;
    };

    let newTools = await scrapeTools();

    if (newTools.length < 10) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return { error: 'Gemini API anahtarı bulunamadı.' };

      const existingList = existingTools.map((t) => `- ${t.name}`).join('\n');

      const prompt = `
Sen, yapay zeka araçları konusunda uzman bir teknoloji araştırmacısısın.
Görevin, "${categoryName}" kategorisi için internetteki popüler ve GERÇEK yapay zeka araçlarını bulmak.
Aşağıdaki araçları ÜRETME, zaten sitede varlar:
${existingList}

Her araç için name, description ve link ver.
Toplam 20 yeni araç üretmeye çalış.
Cevabını SADECE JSON formatında ver:
{ "tools": [ { "name": "...", "description": "...", "link": "..." } ] }
      `;

      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const result = await res.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const aiTools = JSON.parse(text).tools || [];
          newTools = [
            ...newTools,
            ...aiTools.filter(
              (t) => !existingNames.has(t.name.toLowerCase()) && !existingLinks.has(t.link)
            ),
          ];
        }
      }
    }

    if (!newTools.length) return { error: 'Yeni araç bulunamadı.' };

    const toolsToInsert = newTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      link: tool.link,
      slug: tool.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
      is_approved: false,
      suggester_email: `ai-factory@${categoryName.toLowerCase()}.com`,
      category_id: categoryId,
    }));

    const { error: insertError } = await supabaseAdmin.from('tools').insert(toolsToInsert);
    if (insertError) throw insertError;

    revalidatePath('/admin');
    return { success: true, count: toolsToInsert.length };
  } catch (e) {
    console.error('DeepSearch AI Araç Hatası:', e.message);
    return { error: 'Araçlar üretilirken beklenmedik bir hata oluştu.' };
  }
}

export async function handleOnboardingStep(history, userAnswer) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Bu işlem için giriş yapmalısınız.' };

  try {
    const { data: categories } = await supabase.from('categories').select('name');
    const categoryList = categories.map((c) => c.name).join(', ');

    const systemPrompt = `
        Sen, 'AI Keşif Platformu'na yeni katılmış bir kullanıcıyı karşılayan, samimi ve yardımcı bir AI asistanısın. Görevin, kullanıcıya sorular sorarak ilgi alanlarını öğrenmek ve bu bilgilere göre onun platform deneyimini kişiselleştirmektir. Kısa ve net cevaplar ver.

        Sohbet Akışı:
        1.  Kullanıcıya hoş geldin de ve amacını anlat.
        2.  Ona şu kategorilerden hangileriyle ilgilendiğini sor: ${categoryList}.
        3.  Cevabına göre, teşekkür et ve onun için platformu kişiselleştireceğini söyle.
        4.  Son olarak, sohbete "complete" anahtar kelimesini içeren bir JSON cevabı ile son ver.

        KULLANICI İLE ÖNCEKİ KONUŞMA:
        ${JSON.stringify(history)}

        KULLANICININ YENİ CEVABI: "${userAnswer}"

        Şimdi, bu bağlama göre bir sonraki cevabını, SADECE aşağıdaki JSON formatında ver:
    `;

    const chatHistory = [{ role: 'user', parts: [{ text: systemPrompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            response_text: { type: 'STRING' },
            action: {
              type: 'STRING',
              description: "'complete' veya 'continue'",
            },
          },
          required: ['response_text', 'action'],
        },
      },
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: 'Gemini API anahtarı bulunamadı.' };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return { error: `Yapay zeka modelinden hata alındı.` };

    const result = await response.json();
    const aiResponse = JSON.parse(result.candidates[0].content.parts[0].text);

    if (aiResponse.action === 'complete') {
      const supabaseAdmin = createAdminClient();
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (updateError) {
        console.error('Onboarding tamamlama hatası:', updateError);
        return {
          error: 'Profiliniz güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        };
      }
      revalidatePath('/');
    }

    return { success: true, data: aiResponse };
  } catch (e) {
    console.error('Onboarding Asistanı hatası:', e.message);
    return { error: `Bir hata oluştu: ${e.message}` };
  }
}

export async function getVoiceAgentResponse(userQuery) {
  'use server';

  if (!userQuery) {
    return { error: 'Sorgu boş olamaz.' };
  }

  try {
    const supabase = createClient();

    const queryEmbedding = await getEmbedding(userQuery);

    const { data: context, error: contextError } = await supabase.rpc(
      'get_context_for_voice_agent',
      {
        query_embedding: queryEmbedding,
      }
    );

    if (contextError) throw contextError;

    const formattedContext = `
        Platform İstatistikleri: ${JSON.stringify(context.platform_stats)}
        Kullanıcının Sorusuyla En Alakalı Araçlar: ${JSON.stringify(context.relevant_tools)}
    `;

    const prompt = `
        Sen, 'AI Keşif Platformu'nun her şeyini bilen, son derece bilgili ve samimi sesli yardımcı asistanısın. Görevin, sana sunulan bağlamı (platform istatistikleri ve kullanıcının sorusuyla en alakalı araçlar) kullanarak, kullanıcının sorduğu soruya kısa, doğal ve akıcı bir dille sesli olarak cevap vermektir. Eğer kullanıcı "ChatGPT" gibi spesifik bir araç soruyorsa ve bu araç "En Alakalı Araçlar" listesinde görünmüyorsa, bunun yerine ona en yakın alternatifleri öner. Asla "bilmiyorum" deme, her zaman yardımcı olmaya çalış.

        SAĞLANAN BAĞLAM:
        ${formattedContext}

        KULLANICININ SORUSU:
        "${userQuery}"

        Şimdi, bu bilgilere dayanarak kullanıcıya sesli olarak okunacak cevabını oluştur.
    `;

    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: 'Gemini API anahtarı bulunamadı.' };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      return { error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}` };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { success: true, text: result.candidates[0].content.parts[0].text };
    } else {
      return { error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.' };
    }
  } catch (e) {
    console.error('Sesli Agent fonksiyonunda hata:', e.message);
    return { error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}` };
  }
}

export async function getAdvancedVoiceAgentResponse(userQuery, history) {
  'use server';

  if (!userQuery) {
    return { error: 'Sorgu boş olamaz.' };
  }

  try {
    const supabase = createClient();

    const queryEmbedding = await getEmbedding(userQuery);

    const { data: context, error: contextError } = await supabase.rpc('get_full_context_for_ai', {
      p_query_text: userQuery,
      p_query_embedding: queryEmbedding,
    });

    if (contextError) throw contextError;

    const formattedContext = `
        Kullanıcının Sorusuyla İlgili Platform Verileri:
        - Anlamsal Olarak Benzer Araçlar: ${JSON.stringify(context.semantic_tools)}
        - Anahtar Kelime Eşleşmesiyle Bulunan Araç: ${JSON.stringify(context.exact_match_tool)}
        - İlgili Blog Yazıları/Rehberler: ${JSON.stringify(context.relevant_posts)}
    `;

    const prompt = `
        Sen, 'AI Keşif Platformu'nun baş konsiyerjisin. Görevin, sana sunulan platform verilerini ve kullanıcıyla olan konuşma geçmişini sentezleyerek, kullanıcının sorduğu son soruya yönelik en akıllı, en yardımcı ve en insancıl cevabı vermektir. Cevabın, kullanıcıya hem sesli olarak okunacak bir metin hem de görsel olarak gösterilecek tıklanabilir içerik önerileri içermelidir.

        SAĞLANAN BAĞLAM:
        ${formattedContext}

        KULLANICI İLE ÖNCEKİ KONUŞMA:
        ${JSON.stringify(history)}

        KULLANICININ YENİ SORUSU:
        "${userQuery}"

        Şimdi, bu bilgilere dayanarak cevabını SADECE aşağıdaki JSON formatında oluştur:
    `;

    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            spoken_response: { type: 'STRING' },
            suggested_content: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  type: { type: 'STRING' },
                  title: { type: 'STRING' },
                  url: { type: 'STRING' },
                },
              },
            },
          },
          required: ['spoken_response'],
        },
      },
    };

    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      return { error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}` };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { success: true, data: JSON.parse(result.candidates[0].content.parts[0].text) };
    } else {
      return { error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.' };
    }
  } catch (e) {
    console.error('Gelişmiş Sesli Agent fonksiyonunda hata:', e.message);
    return { error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}` };
  }
}

export async function getAiConciergeResponse(userQuery, history) {
  'use server';
  if (!userQuery) return { error: 'Sorgu boş olamaz.' };

  try {
    const supabase = createClient();
    const queryEmbedding = await getEmbedding(userQuery);
    const { data: context, error: contextError } = await supabase.rpc('get_full_context_for_ai', {
      p_query_text: userQuery,
      p_query_embedding: queryEmbedding,
    });
    if (contextError) throw contextError;

    const formattedContext = `
        Kullanıcının Sorusuyla İlgili Platform Verileri:
        - Anlamsal Olarak Benzer Araçlar: ${JSON.stringify(context.semantic_tools)}
        - Anahtar Kelime Eşleşmesiyle Bulunan Araç: ${JSON.stringify(context.exact_match_tool)}
        - İlgili Blog Yazıları/Rehberler: ${JSON.stringify(context.relevant_posts)}
    `;

    const prompt = `
        Sen, 'AI Keşif Platformu'nun baş konsiyerjisin. Görevin, sana sunulan platform verilerini ve kullanıcıyla olan konuşma geçmişini sentezleyerek, kullanıcının sorduğu son soruya yönelik en akıllı ve en yardımcı cevabı vermektir. Cevabın, kullanıcıya hem okunacak bir metin hem de görsel olarak gösterilecek tıklanabilir içerik önerileri içermelidir.

        SAĞLANAN BAĞLAM: ${formattedContext}
        ÖNCEKİ KONUŞMA: ${JSON.stringify(history)}
        KULLANICININ YENİ SORUSU: "${userQuery}"

        Şimdi, bu bilgilere dayanarak cevabını SADECE aşağıdaki JSON formatında oluştur:
    `;

    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            spoken_response: { type: 'STRING' },
            suggested_content: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  type: { type: 'STRING' },
                  title: { type: 'STRING' },
                  url: { type: 'STRING' },
                },
              },
            },
          },
          required: ['spoken_response'],
        },
      },
    };

    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      return { error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}` };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { success: true, data: JSON.parse(result.candidates[0].content.parts[0].text) };
    } else {
      return { error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.' };
    }
  } catch (e) {
    console.error('AI Konsiyerj fonksiyonunda hata:', e.message);
    return { error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}` };
  }
}

export async function getAiMentorFeedback(userPrompt) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Bu özelliği kullanmak için giriş yapmalısınız.' };
  }

  if (!userPrompt || userPrompt.trim().length < 10) {
    return { error: 'Lütfen daha detaylı bir fikir veya prompt girin.' };
  }

  try {
    const prompt = `
        Sen, yapay zeka ile görsel veya metin üreten bir kullanıcıya akıl hocalığı yapan, son derece yaratıcı ve yardımcı bir "AI Mentor"'sun. Görevin, sana verilen bir fikri veya prompt'u analiz ederek, onu daha zengin, daha detaylı ve daha etkileyici hale getirecek somut öneriler sunmaktır.

        KULLANICININ İLK FİKRİ/PROMPT'U:
        "${userPrompt}"

        YAPILACAKLAR:
        1.  Bu fikrin potansiyelini analiz et.
        2.  Fikri daha iyi hale getirmek için 3 adet somut ve yaratıcı öneri sun. Bu öneriler, stile, atmosfere, detaylara veya konuya yönelik olabilir.
        3.  Bu önerileri birleştirerek, kullanıcının doğrudan kopyalayıp kullanabileceği, geliştirilmiş ve zenginleştirilmiş yeni bir prompt metni oluştur.
        4.  Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
    `;

    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            analysis: {
              type: 'STRING',
              description: 'İlk fikrin potansiyeli hakkında kısa bir analiz.',
            },
            suggestions: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Fikri geliştirmek için 3 adet somut öneri.',
            },
            improved_prompt: {
              type: 'STRING',
              description: 'Önerileri içeren, geliştirilmiş yeni prompt metni.',
            },
          },
          required: ['analysis', 'suggestions', 'improved_prompt'],
        },
      },
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: 'Gemini API anahtarı bulunamadı.' };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      return { error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}` };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { success: true, data: JSON.parse(result.candidates[0].content.parts[0].text) };
    } else {
      return { error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.' };
    }
  } catch (e) {
    console.error('AI Mentor fonksiyonunda hata:', e.message);
    return { error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}` };
  }
}
