'use server';

import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { slugify } from '@/utils/slugify';
import { Resend } from 'resend';
import { getEmbedding } from './ai';
import { NewToolSuggestionEmail } from '@/components/emails/NewToolSuggestionEmail';
import { cookies } from 'next/headers';
import { logServerError } from '@/utils/serverLogger';
import { enforceRateLimit, validateHumanForm } from '@/utils/antiAbuse';
import {
  inferPlatformsFromLink,
  inferPricingModel,
  isLikelyEnglishDescription,
  normalizeTextField,
  normalizeToolLink,
  normalizeToolUrl,
} from '@/lib/toolQuality';
import { getBlockedToolHost } from '@/lib/toolLinkPolicy';

const ITEMS_PER_PAGE = 12;
const GEMINI_RETRY_BASE_DELAY_MS = 2500;
const GEMINI_MAX_RETRY_PER_MODEL = 2;
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildFallbackToolDescription({ name, description, link }) {
  const normalizedName = normalizeTextField(name);
  const baseDescription = normalizeTextField(description);
  if (!normalizedName || !baseDescription) return null;

  const normalizedLink = normalizeToolUrl(link);
  let hostPart = 'web üzerinde';
  if (normalizedLink) {
    try {
      hostPart = new URL(normalizedLink).hostname.replace(/^www\./, '');
    } catch {
      hostPart = 'web üzerinde';
    }
  }

  const seedText = baseDescription.replace(/[.!?]+$/g, '').replace(/\s+/g, ' ');

  const fallback = normalizeTextField(
    `${normalizedName}, ${hostPart} üzerinden erişilebilen bir yapay zeka aracıdır. ${seedText}. Günlük iş akışlarında daha hızlı ve verimli sonuç üretmeye yardımcı olur.`
  );

  if (fallback.length < 90) return null;
  if (fallback.length <= 220) return fallback;
  return `${fallback.slice(0, 217).trimEnd()}...`;
}

// Araçları çeken yardımcı (getSimilarTools için)
async function getOtherToolsForAI(currentToolId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tools')
    .select('name, slug, description')
    .eq('is_approved', true)
    .neq('id', currentToolId);

  if (error) {
    console.error('AI için diğer araçlar çekilirken hata:', error);
    return [];
  }
  return data;
}

async function rewriteToolDescriptionWithGemini({ name, description, link, apiKey }) {
  const prompt = `
Bir yapay zeka araç kataloğu için Türkçe ürün açıklaması editörüsün.

Araç adı: "${name || ''}"
Mevcut açıklama: "${description || ''}"
Araç bağlantısı: "${link || ''}"

Görev:
1) Açıklamayı Türkçe, anlaşılır ve kullanıcı odaklı hale getir.
2) 90-220 karakter aralığında yaz.
3) Sadece ürünün amacı ve temel faydasını anlat.
4) Abartılı/yanıltıcı ifade kullanma.
5) Sadece düz metin döndür, JSON/markdown kullanma.
`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 220,
    },
  };

  let rateLimited = false;

  for (const modelName of GEMINI_MODELS) {
    let retryDelay = GEMINI_RETRY_BASE_DELAY_MS;

    for (let attempt = 0; attempt <= GEMINI_MAX_RETRY_PER_MODEL; attempt += 1) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 429) {
          rateLimited = true;
          if (attempt < GEMINI_MAX_RETRY_PER_MODEL) {
            await sleep(retryDelay);
            retryDelay *= 2;
            continue;
          }
          break;
        }

        return { text: null, rateLimited };
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return { text: null, rateLimited };

      const normalized = normalizeTextField(text);
      if (normalized.length < 60 || normalized.length > 1200) {
        return { text: null, rateLimited };
      }

      return { text: normalized, rateLimited };
    }
  }

  return { text: null, rateLimited };
}

export async function submitTool(formData) {
  'use server';

  const humanCheck = validateHumanForm(formData);
  if (!humanCheck.valid) {
    return redirect(`/submit?message=${encodeURIComponent(humanCheck.error)}`);
  }

  const rateLimit = await enforceRateLimit('tool-submission', {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return redirect(
      `/submit?message=${encodeURIComponent(
        `Çok fazla öneri gönderdiniz. Yaklaşık ${Math.ceil(
          rateLimit.retryAfterSeconds / 60
        )} dakika sonra tekrar deneyin.`
      )}`
    );
  }

  const supabase = createClient(await cookies());
  const resend = new Resend(process.env.RESEND_API_KEY);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = String(formData.get('name') || '').trim();
  const rawLink = String(formData.get('link') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const category_id = String(formData.get('category_id') || '').trim();
  const suggester_email_from_form = String(formData.get('suggester_email') || '').trim();

  const final_suggester_email = user ? user.email : suggester_email_from_form;

  if (
    name.length < 2 ||
    name.length > 80 ||
    description.length < 20 ||
    description.length > 600 ||
    !category_id ||
    !final_suggester_email
  ) {
    const errorMessage = 'Lütfen tüm alanları belirtilen kurallara uygun doldurun.';
    return redirect(`/submit?message=${encodeURIComponent(errorMessage)}`);
  }

  let normalizedLink;
  try {
    const parsedLink = new URL(rawLink);
    if (!['http:', 'https:'].includes(parsedLink.protocol)) {
      throw new Error('Invalid protocol');
    }
    normalizedLink = parsedLink.toString();
  } catch {
    return redirect(
      `/submit?message=${encodeURIComponent('Geçerli bir resmî web sitesi adresi girin.')}`
    );
  }

  if (getBlockedToolHost(normalizedLink)) {
    return redirect(
      `/submit?message=${encodeURIComponent(
        'Dizin/aggregator bağlantıları kabul edilmiyor. Lütfen aracın resmî web sitesini girin.'
      )}`
    );
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(final_suggester_email) || final_suggester_email.length > 254) {
    return redirect(`/submit?message=${encodeURIComponent('Geçerli bir e-posta adresi girin.')}`);
  }

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('id', category_id)
    .maybeSingle();

  if (!category) {
    return redirect(`/submit?message=${encodeURIComponent('Lütfen geçerli bir kategori seçin.')}`);
  }

  const slug = slugify(name);

  const toolData = {
    name,
    slug,
    link: normalizedLink,
    description,
    category_id,
    user_id: user?.id,
    suggester_email: final_suggester_email,
    is_approved: false,
  };

  try {
    const textToEmbed = `${name}. ${description}.`;
    const embedding = await getEmbedding(textToEmbed);
    toolData.embedding = `[${embedding.join(',')}]`;
  } catch (err) {
    console.error('Embedding generation error on submit:', err);
  }

  const { error } = await supabase.from('tools').insert([toolData]);

  if (error) {
    let errorMessage = 'Bir hata oluştu, lütfen tekrar deneyin.';
    if (error.code === '23505') {
      errorMessage = 'Bu araç zaten önerilmiş veya bu isim kullanılıyor.';
    }
    return redirect(`/submit?message=${encodeURIComponent(errorMessage)}`);
  }

  try {
    await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: process.env.ADMIN_NOTIF_EMAIL_TO,
      subject: `Yeni Araç Önerisi: ${name}`,
      react: NewToolSuggestionEmail({
        toolName: name,
        toolLink: normalizedLink,
        toolDescription: description,
        suggesterEmail: final_suggester_email,
        isLoggedInUser: !!user,
      }),
    });
  } catch (emailError) {
    console.error('E-posta gönderme hatası:', emailError);
  }

  return redirect('/submit?status=success');
}

export async function approveTool(formData) {
  'use server';
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const supabaseAdmin = createAdminClient();
  const toolId = String(formData.get('toolId') || '').trim();

  if (!toolId) {
    return { error: "Araç ID'si bulunamadı." };
  }

  const { data: pendingTool, error: pendingToolError } = await supabaseAdmin
    .from('tools')
    .select('name, link, category_id, slug')
    .eq('id', toolId)
    .eq('is_approved', false)
    .maybeSingle();

  if (pendingToolError) {
    console.error('Onay bekleyen araç okunamadı:', pendingToolError);
    return { error: 'Araç bilgileri doğrulanamadı.' };
  }

  if (!pendingTool) {
    return { error: 'Araç bulunamadı veya daha önce işleme alınmış.' };
  }

  if (!pendingTool.name?.trim() || !pendingTool.category_id || !pendingTool.slug?.trim()) {
    return {
      error: 'Araç onaylanmadan önce isim, kategori ve slug bilgileri tamamlanmalı.',
    };
  }

  try {
    const parsedLink = new URL(pendingTool.link);
    if (!['http:', 'https:'].includes(parsedLink.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return { error: 'Araç onaylanmadan önce geçerli bir site bağlantısı girilmeli.' };
  }

  if (getBlockedToolHost(pendingTool.link)) {
    return {
      error:
        'Bu kayıt dizin bağlantısına yönleniyor. Onaylamadan önce aracın resmî web sitesi ile güncelleyin.',
    };
  }

  const { data: approvedTool, error } = await supabaseAdmin
    .from('tools')
    .update({ is_approved: true })
    .eq('id', toolId)
    .eq('is_approved', false)
    .select('slug')
    .maybeSingle();

  if (error) {
    console.error('Araç onaylama hatası:', error);
    return { error: 'Araç onaylanırken bir hata oluştu.' };
  }

  if (!approvedTool) return { error: 'Araç daha önce işleme alınmış.' };

  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath(`/tool/${approvedTool.slug}`);
  return { success: 'Araç başarıyla onaylandı.' };
}

export async function rejectTool(formData) {
  'use server';
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const toolId = String(formData.get('toolId') || '').trim();
  if (!toolId) {
    return { error: "Araç ID'si bulunamadı." };
  }

  const supabaseAdmin = createAdminClient();
  const { data: rejectedTool, error } = await supabaseAdmin
    .from('tools')
    .delete()
    .eq('id', toolId)
    .eq('is_approved', false)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Araç reddetme hatası:', error);
    return { error: 'Araç reddedilirken bir hata oluştu.' };
  }

  if (!rejectedTool) {
    return { error: 'Araç bulunamadı veya daha önce işleme alınmış.' };
  }

  revalidatePath('/admin');
  return { success: 'Araç önerisi reddedildi.' };
}

export async function rateTool(formData) {
  'use server';
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Puan vermek için giriş yapmalısınız.' };

  const toolId = formData.get('toolId');
  const rating = formData.get('rating');

  const { error } = await supabase.rpc('upsert_rating_and_award_points', {
    p_tool_id: toolId,
    p_user_id: user.id,
    p_rating: rating,
  });

  if (error) {
    console.error('Puanlama ve puan verme hatası:', error);
    return { error: 'İşlem sırasında bir hata oluştu.' };
  }

  revalidatePath(`/tool/${formData.get('toolSlug')}`);
  return { success: 'Oyunuz kaydedildi.' };
}

export async function toggleFavorite(toolId, toolSlug, isFavorited) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Bu işlem için giriş yapmalısınız.' };
  }

  if (isFavorited) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('tool_id', toolId);

    if (error) {
      console.error('Favori silme hatası:', error);
      return { error: 'Araç favorilerden çıkarılırken bir hata oluştu.' };
    }

    revalidatePath(`/tool/${toolSlug}`);
    revalidatePath('/profile');

    return { success: 'removed' };
  } else {
    const { error } = await supabase.from('favorites').insert({
      user_id: user.id,
      tool_id: toolId,
    });

    if (error) {
      console.error('Favori ekleme hatası:', error);
      return { error: 'Araç favorilere eklenirken bir hata oluştu.' };
    }

    revalidatePath(`/tool/${toolSlug}`);
    revalidatePath('/profile');

    return { success: 'added' };
  }
}

export async function toggleFeatured(formData) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const toolId = formData.get('toolId');
  const newStatus = formData.get('isFeatured') === 'true';

  if (!toolId) {
    return { error: "Araç ID'si bulunamadı." };
  }

  const { error } = await supabase
    .from('tools')
    .update({ is_featured: newStatus })
    .eq('id', toolId);

  if (error) {
    console.error('Öne çıkan durumu güncelleme hatası:', error);
    return { error: 'Durum güncellenirken bir hata oluştu.' };
  }

  revalidatePath('/admin');
  revalidatePath('/');

  return {
    success: `Durum ${newStatus ? 'öne çıkan' : 'normal'} olarak güncellendi.`,
  };
}

export async function updateTool(formData) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const toolId = String(formData.get('toolId') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const rawLink = String(formData.get('link') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const category_id = String(formData.get('category_id') || '').trim();
  const pricing_model = String(formData.get('pricing_model') || '').trim();
  const platforms = formData.getAll('platforms').map((platform) => String(platform));
  const tier = String(formData.get('tier') || '').trim();
  const allowedPricingModels = ['Ücretsiz', 'Freemium', 'Abonelik', 'Tek Seferlik Ödeme'];
  const allowedPlatforms = [
    'Web',
    'iOS',
    'Android',
    'Windows',
    'macOS',
    'Linux',
    'Chrome Uzantısı',
  ];
  const allowedTiers = ['Normal', 'Pro', 'Sponsorlu'];

  if (!toolId || !name || !rawLink || !category_id) {
    return { error: 'Tüm zorunlu alanlar doldurulmalıdır.' };
  }

  if (name.length < 2 || name.length > 100) {
    return { error: 'Araç adı 2 ile 100 karakter arasında olmalıdır.' };
  }

  if (description.length > 1200) {
    return { error: 'Açıklama en fazla 1200 karakter olabilir.' };
  }

  let normalizedLink;
  try {
    const parsedLink = new URL(rawLink);
    if (!['http:', 'https:'].includes(parsedLink.protocol)) {
      throw new Error('Invalid protocol');
    }
    normalizedLink = parsedLink.toString();
  } catch {
    return { error: 'Geçerli bir HTTP veya HTTPS bağlantısı girin.' };
  }

  if (getBlockedToolHost(normalizedLink)) {
    return {
      error:
        'Dizin/aggregator bağlantısı kaydedilemez. Lütfen aracın resmî web sitesi bağlantısını kullanın.',
    };
  }

  if (pricing_model && !allowedPricingModels.includes(pricing_model)) {
    return { error: 'Geçersiz fiyatlandırma modeli.' };
  }

  if (platforms.some((platform) => !allowedPlatforms.includes(platform))) {
    return { error: 'Geçersiz platform seçimi.' };
  }

  if (!allowedTiers.includes(tier)) {
    return { error: 'Geçersiz araç seviyesi.' };
  }

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('id', category_id)
    .maybeSingle();

  if (!category) {
    return { error: 'Geçerli bir kategori seçin.' };
  }

  const updatedData = {
    name,
    link: normalizedLink,
    description,
    category_id,
    pricing_model: pricing_model || null,
    platforms,
    tier,
    updated_at: new Date().toISOString(),
  };

  try {
    const textToEmbed = `${name}. ${description}.`;
    const embedding = await getEmbedding(textToEmbed);
    updatedData.embedding = `[${embedding.join(',')}]`;
  } catch (err) {
    console.error('Embedding generation error on update:', err);
  }

  const { error } = await supabase.from('tools').update(updatedData).eq('id', toolId);

  if (error) {
    console.error('Araç güncelleme hatası:', error);
    return { error: 'Araç güncellenirken bir hata oluştu.' };
  }

  revalidatePath('/admin');
  revalidatePath('/');

  const { data: tool } = await supabase.from('tools').select('slug').eq('id', toolId).single();
  if (tool) {
    revalidatePath(`/tool/${tool.slug}`);
  }

  return { success: 'Araç başarıyla güncellendi.' };
}

export async function runToolQualityAutomation() {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const supabaseAdmin = createAdminClient();
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const maxAiFixCount = 30;
  const { data: tools, error: toolsError } = await supabaseAdmin
    .from('tools')
    .select('id, name, slug, link, description, pricing_model, platforms, is_approved, updated_at')
    .eq('is_approved', true);

  if (toolsError) {
    console.error('Kalite otomasyonu için araçlar okunamadı:', toolsError);
    return { error: 'Araçlar okunamadı. Lütfen tekrar deneyin.' };
  }

  if (!tools || tools.length === 0) {
    return {
      success: true,
      scannedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      inferredPricingCount: 0,
      defaultedPlatformCount: 0,
      duplicateNameCount: 0,
      duplicateLinkCount: 0,
    };
  }

  const duplicateNames = new Map();
  const duplicateLinks = new Map();

  for (const tool of tools) {
    const normalizedName = String(tool.name || '')
      .trim()
      .toLocaleLowerCase('tr-TR');
    if (normalizedName) {
      duplicateNames.set(normalizedName, (duplicateNames.get(normalizedName) || 0) + 1);
    }

    const normalizedLink = normalizeToolLink(tool.link);
    if (normalizedLink) {
      duplicateLinks.set(normalizedLink, (duplicateLinks.get(normalizedLink) || 0) + 1);
    }
  }

  const duplicateNameCount = tools.filter((tool) => {
    const normalizedName = String(tool.name || '')
      .trim()
      .toLocaleLowerCase('tr-TR');
    return normalizedName && (duplicateNames.get(normalizedName) || 0) > 1;
  }).length;

  const duplicateLinkCount = tools.filter((tool) => {
    const normalizedLink = normalizeToolLink(tool.link);
    return normalizedLink && (duplicateLinks.get(normalizedLink) || 0) > 1;
  }).length;

  let updatedCount = 0;
  let failedCount = 0;
  let inferredPricingCount = 0;
  let defaultedPlatformCount = 0;
  let aiDescriptionFixCount = 0;
  let fallbackDescriptionFixCount = 0;
  let aiAttemptedCount = 0;
  let aiSkippedDueToLimitCount = 0;
  let aiRateLimitHitCount = 0;
  let aiSkippedDueToMissingKeyCount = 0;
  let shortDescriptionCount = 0;
  let englishDescriptionCount = 0;
  const touchedSlugs = new Set();

  for (const tool of tools) {
    const updates = {};
    const normalizedName = normalizeTextField(tool.name);
    const normalizedDescription = normalizeTextField(tool.description, {
      preserveNewLines: true,
    });
    const normalizedLink = normalizeToolUrl(tool.link);

    if (normalizedName && normalizedName !== String(tool.name || '').trim()) {
      updates.name = normalizedName;
      if (!String(tool.slug || '').trim()) {
        updates.slug = slugify(normalizedName);
      }
    }

    const isShortDescription =
      normalizedDescription.length > 0 && normalizedDescription.length < 80;
    const isEnglishDescription = isLikelyEnglishDescription(normalizedDescription);
    if (isShortDescription) shortDescriptionCount += 1;
    if (isEnglishDescription) englishDescriptionCount += 1;

    if (normalizedDescription && normalizedDescription !== String(tool.description || '').trim()) {
      updates.description = normalizedDescription;
    }

    if (normalizedLink && normalizedLink !== String(tool.link || '').trim()) {
      updates.link = normalizedLink;
    }

    if (
      geminiApiKey &&
      aiAttemptedCount < maxAiFixCount &&
      (isShortDescription || isEnglishDescription)
    ) {
      aiAttemptedCount += 1;
      const aiResult = await rewriteToolDescriptionWithGemini({
        name: normalizedName || tool.name,
        description: normalizedDescription || tool.description,
        link: normalizedLink || tool.link,
        apiKey: geminiApiKey,
      });

      if (aiResult.rateLimited) {
        aiRateLimitHitCount += 1;
      }

      if (aiResult.text && aiResult.text !== (updates.description || normalizedDescription || '')) {
        updates.description = aiResult.text;
        aiDescriptionFixCount += 1;
      }
    } else if (!geminiApiKey && (isShortDescription || isEnglishDescription)) {
      aiSkippedDueToMissingKeyCount += 1;
    } else if (
      geminiApiKey &&
      aiAttemptedCount >= maxAiFixCount &&
      (isShortDescription || isEnglishDescription)
    ) {
      aiSkippedDueToLimitCount += 1;
    }

    if (!updates.description && isShortDescription) {
      const fallbackDescription = buildFallbackToolDescription({
        name: normalizedName || tool.name,
        description: normalizedDescription || tool.description,
        link: normalizedLink || tool.link,
      });

      if (
        fallbackDescription &&
        fallbackDescription !== (normalizedDescription || String(tool.description || '').trim())
      ) {
        updates.description = fallbackDescription;
        fallbackDescriptionFixCount += 1;
      }
    }

    const hasPlatforms = Array.isArray(tool.platforms) && tool.platforms.filter(Boolean).length > 0;
    if (!hasPlatforms) {
      const inferredPlatforms = inferPlatformsFromLink(
        normalizedLink || String(tool.link || '').trim()
      );
      if (inferredPlatforms) {
        updates.platforms = inferredPlatforms;
        defaultedPlatformCount += 1;
      }
    }

    if (!tool.pricing_model) {
      const inferredPricing = inferPricingModel(
        normalizedDescription || tool.description,
        normalizedLink || tool.link
      );
      if (inferredPricing) {
        updates.pricing_model = inferredPricing;
        inferredPricingCount += 1;
      }
    }

    if (Object.keys(updates).length === 0) continue;

    updates.updated_at = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('tools')
      .update(updates)
      .eq('id', tool.id);

    if (updateError) {
      failedCount += 1;
      console.error(`Kalite otomasyonu güncelleme hatası (tool:${tool.id}):`, updateError);
      if (updates.pricing_model) inferredPricingCount -= 1;
      if (updates.platforms) defaultedPlatformCount -= 1;
      continue;
    }

    updatedCount += 1;
    if (tool.slug) touchedSlugs.add(tool.slug);
    if (updates.slug) touchedSlugs.add(updates.slug);
  }

  revalidatePath('/admin');
  revalidatePath('/');
  for (const slug of touchedSlugs) {
    revalidatePath(`/tool/${slug}`);
  }

  return {
    success: true,
    scannedCount: tools.length,
    updatedCount,
    failedCount,
    inferredPricingCount,
    defaultedPlatformCount,
    duplicateNameCount,
    duplicateLinkCount,
    shortDescriptionCount,
    englishDescriptionCount,
    aiDescriptionFixCount,
    fallbackDescriptionFixCount,
    aiAttemptedCount,
    aiSkippedDueToLimitCount,
    aiRateLimitHitCount,
    aiSkippedDueToMissingKeyCount,
    aiEnabled: Boolean(geminiApiKey),
    ranAt: new Date().toISOString(),
  };
}

export async function deleteTool(formData) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const toolId = formData.get('toolId');

  if (!toolId) {
    return { error: "Araç ID'si bulunamadı." };
  }

  const { error } = await supabase.from('tools').delete().eq('id', toolId);

  if (error) {
    console.error('Araç silme hatası:', error);
    return { error: 'Araç silinirken bir hata oluştu.' };
  }

  revalidatePath('/admin');
  revalidatePath('/');

  return { success: 'Araç başarıyla silindi.' };
}

export async function getSimilarTools(currentTool) {
  'use server';

  if (!currentTool) {
    return { success: false, error: 'Mevcut araç bilgisi eksik.' };
  }

  try {
    const otherTools = await getOtherToolsForAI(currentTool.id);
    if (otherTools.length === 0) {
      return {
        success: false,
        error: 'Karşılaştırılacak başka araç bulunamadı.',
      };
    }

    const formattedTools = otherTools
      .map((t) => `- ${t.name} (${t.slug}): ${t.description}`)
      .join('\n');
    const prompt = `
      Bir "AI Araçları Keşif Platformu" için tavsiye motorusun. Sana verilen bir araca en çok benzeyen veya onu tamamlayan 3 aracı, aşağıdaki listeden seçmelisin.

      Referans Araç: 
      - Adı: "${currentTool.name}"
      - Açıklaması: "${currentTool.description}"

      Karşılaştırılacak Diğer Araçların Listesi:
      ${formattedTools}

      Görevin: Referans araca en çok benzeyen veya onu tamamlayan en iyi 3 aracı seçmek ve her biri için neden benzer/tamamlayıcı olduğunu TEK bir cümle ile açıklamaktır. Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
    `;

    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            similar_tools: {
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
      console.error('Gemini API Hatası (Benzer Araçlar):', errorBody);
      return { success: false, error: 'Yapay zeka modelinden hata alındı.' };
    }

    const result = await response.json();

    if (
      result.candidates &&
      result.candidates[0].content &&
      result.candidates[0].content.parts[0].text
    ) {
      const textResponse = result.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(textResponse);
      return { success: true, data: parsedJson.similar_tools || [] };
    } else {
      return {
        success: false,
        error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.',
      };
    }
  } catch (e) {
    console.error('Benzer araçlar fonksiyonunda genel hata:', e);
    return {
      success: false,
      error: 'Tavsiye alınırken beklenmedik bir hata oluştu.',
    };
  }
}

export async function getRandomTool() {
  'use server';

  const supabase = createClient();

  const { data, error } = await supabase
    .from('tools')
    .select('slug')
    .eq('is_approved', true)
    .order('random()')
    .limit(1)
    .single();

  if (error || !data) {
    console.error('Rastgele araç çekilirken hata:', error);
    return redirect('/');
  }

  return redirect(`/tool/${data.slug}`);
}

export async function fetchMoreTools({ page = 0, searchParams }) {
  'use server';

  const supabase = createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('stripe_price_id').eq('id', user.id).single()
    : { data: null };

  const isProUser = !!profile?.stripe_price_id || (user && user.email === process.env.ADMIN_EMAIL);

  const searchText = searchParams.search || null;
  const categorySlug = searchParams.category || null;
  const sortBy = searchParams.sort || 'newest';
  const tags = searchParams.tags ? searchParams.tags.split(',').map(Number) : [];
  const pricingModel = searchParams.pricing || null;
  const platforms = searchParams.platforms ? searchParams.platforms.split(',') : [];
  const tier = searchParams.tier || null;

  const { data: tools, error } = await supabase.rpc('get_public_tools', {
    p_page: page,
    p_page_size: ITEMS_PER_PAGE,
    p_search_text: searchText,
    p_category_slug: categorySlug,
    p_sort_by: sortBy,
    p_tags: tags,
    p_pricing_model: pricingModel,
    p_platforms: platforms,
    p_tier: tier,
    p_is_pro_user: isProUser,
  });

  if (error) {
    console.error('Araç çekerken hata:', error.message);
    return [];
  }

  return tools.map((tool) => ({
    ...tool,
    popularity_score: Number(tool.popularity_score) || 0,
  }));
}

export async function recordVariantImpression(variantId) {
  'use server';
  if (!variantId) return;
  const supabase = createClient();
  await supabase.rpc('increment_variant_impression', { p_variant_id: variantId });
}

export async function recordVariantClick(variantId) {
  'use server';
  if (!variantId) return;
  const supabase = createClient();
  await supabase.rpc('increment_variant_click', { p_variant_id: variantId });
}

export async function generateToolVariants(toolId) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Bu özelliği kullanmak için yetkiniz yok.' };
  }

  if (!toolId) {
    return { error: "Analiz edilecek araç ID'si bulunamadı." };
  }

  try {
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('name, description')
      .eq('id', toolId)
      .single();

    if (toolError) throw new Error('Araç bilgileri alınamadı.');

    const prompt = `
      Sen, teknoloji ürünleri için pazarlama metinleri yazma konusunda uzman bir metin yazarı (copywriter)'sın. Görevin, sana verilen bir yapay zeka aracının orijinal başlığına ve açıklamasına bakarak, kullanıcıların tıklama oranını (CTR) artıracak, daha dikkat çekici ve fayda odaklı 3 adet alternatif başlık ve açıklama çifti üretmektir.

      ORİJİNAL İÇERİK:
      - Başlık: "${tool.name}"
      - Açıklama: "${tool.description}"

      Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
    `;

    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            variants: {
              type: 'ARRAY',
              description: '3 adet başlık ve açıklama çifti içeren bir dizi.',
              items: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING' },
                  description: { type: 'STRING' },
                },
                required: ['title', 'description'],
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
      const errorBody = await response.json();
      return {
        error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}`,
      };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      const parsedResult = JSON.parse(result.candidates[0].content.parts[0].text);
      return { success: true, data: parsedResult.variants };
    } else {
      return {
        error: 'Yapay zeka modelinden beklenen formatta bir cevap alınamadı.',
      };
    }
  } catch (e) {
    console.error('AI Varyant Üretme fonksiyonunda hata:', e.message);
    return {
      error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}`,
    };
  }
}

export async function updateToolVariants(formData) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const toolId = formData.get('toolId');
  const variants = JSON.parse(formData.get('variants') || '[]');

  if (!toolId) {
    return { error: "Araç ID'si bulunamadı." };
  }

  const supabaseAdmin = createAdminClient();

  const { error: deleteError } = await supabaseAdmin
    .from('tool_variants')
    .delete()
    .eq('tool_id', toolId)
    .eq('is_original', false);

  if (deleteError) {
    console.error('Eski varyantları silme hatası:', deleteError);
    return { error: 'Varyantlar güncellenirken bir hata oluştu.' };
  }

  if (variants.length > 0) {
    const variantsToInsert = variants.map((v) => ({
      tool_id: toolId,
      title: v.title,
      description: v.description,
      is_active: v.is_active,
      is_original: false,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('tool_variants')
      .insert(variantsToInsert);

    if (insertError) {
      console.error('Yeni varyantları ekleme hatası:', insertError);
      return { error: 'Varyantlar güncellenirken bir hata oluştu.' };
    }
  }

  revalidatePath('/admin');
  return { success: 'Araç varyantları başarıyla güncellendi.' };
}

export async function applyWinningVariant(formData) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const toolId = formData.get('toolId');
  const newTitle = formData.get('newTitle');
  const newDescription = formData.get('newDescription');

  if (!toolId || !newTitle || !newDescription) {
    return { error: 'Gerekli bilgiler eksik.' };
  }

  const supabaseAdmin = createAdminClient();

  const { error: updateError } = await supabaseAdmin
    .from('tools')
    .update({ name: newTitle, description: newDescription })
    .eq('id', toolId);

  if (updateError) {
    console.error('Kazanan varyant uygulanırken hata:', updateError);
    return { error: 'Araç güncellenirken bir hata oluştu.' };
  }

  await supabaseAdmin.from('tool_variants').delete().eq('tool_id', toolId).eq('is_original', false);

  revalidatePath('/admin');
  return {
    success: 'Kazanan varyant başarıyla uygulandı ve test sonlandırıldı.',
  };
}

export async function getToolPreviewData(toolSlug) {
  'use server';

  if (!toolSlug) {
    return { error: 'Araç kimliği bulunamadı.' };
  }

  const supabase = createClient();
  const { data: tool, error } = await supabase
    .from('tools_with_ratings')
    .select(
      'id, name, description, slug, average_rating, total_ratings, category_name, pricing_model, link'
    )
    .eq('slug', toolSlug)
    .single();

  if (error || !tool) {
    console.error('Önizleme verisi çekilirken hata:', error);
    return { error: 'Araç detayları alınamadı.' };
  }

  return { success: true, data: tool };
}

export async function recordToolVisit(toolId) {
  'use server';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }

  const { error } = await supabase.rpc('update_quest_progress', {
    p_user_id: user.id,
    p_action_type: 'visit_tool',
  });

  if (error) {
    console.error('Araç ziyareti görevi güncellenirken hata:', error);
  }
}

export async function getToolDetailsForPreview(toolId) {
  'use server';

  if (!toolId) {
    return { error: "Araç ID'si bulunamadı." };
  }

  try {
    const supabase = createClient();

    const { data: tool, error: toolError } = await supabase
      .from('tools_with_ratings')
      .select('*')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      throw new Error('Araç detayları veritabanında bulunamadı.');
    }

    const [{ data: comments }, { data: prompts }] = await Promise.all([
      supabase
        .from('comments')
        .select('content, profiles(username, avatar_url)')
        .eq('tool_id', toolId)
        .limit(2),
      supabase
        .from('prompts')
        .select('title')
        .eq('tool_id', toolId)
        .order('vote_count', { ascending: false })
        .limit(2),
    ]);

    return {
      success: true,
      data: {
        tool,
        comments: comments || [],
        prompts: prompts || [],
      },
    };
  } catch (e) {
    console.error('Araç önizleme verisi çekilirken hata:', e.message);
    return { error: `Veri alınırken bir hata oluştu: ${e.message}` };
  }
}

export async function upsertRating(formData) {
  'use server';
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Puan vermek için giriş yapmalısınız.' };
  }

  const toolId = formData.get('toolId');
  const rating = formData.get('rating');
  const toolSlug = formData.get('toolSlug');

  if (!toolId || !rating) {
    return { error: 'Araç veya puan bilgisi eksik.' };
  }

  const { error } = await supabase.from('ratings').upsert({
    tool_id: toolId,
    user_id: user.id,
    rating: rating,
  });

  if (error) {
    console.error('Puanlama hatası:', error);
    return { error: 'Puanınız kaydedilirken bir hata oluştu.' };
  }

  revalidatePath(`/tool/${toolSlug}`);
  return { success: 'Puanınız başarıyla kaydedildi.' };
}

export async function getSearchSuggestions(query) {
  'use server';
  if (!query || query.length < 2) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tools')
    .select('id, name, slug, link, tier, category_name')
    .eq('is_approved', true)
    .ilike('name', `%${query}%`)
    .limit(5);
  if (error) {
    console.error('Arama önerileri hatası:', error);
    return [];
  }
  return data || [];
}
