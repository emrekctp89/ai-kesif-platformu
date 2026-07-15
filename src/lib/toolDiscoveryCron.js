import { Resend } from 'resend';
import { createAdminClient } from '@/utils/supabase/admin';
import { slugify } from '@/utils/slugify';
import { embedGeminiText } from '@/utils/gemini';
import {
  inferPlatformsFromLink,
  inferPricingModel,
  normalizeTextField,
  normalizeToolLink,
  normalizeToolUrl,
} from '@/lib/toolQuality';
import { getBlockedToolHost } from '@/lib/toolLinkPolicy';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;
const DEFAULT_CANDIDATE_COUNT = 18;
const MAX_CANDIDATE_COUNT = 40;
const DEFAULT_TIMEOUT_MS = 7000;
const ADMIN_NOTIFICATION_LINK = '/admin';
const DISCOVERY_BOT_EMAIL = 'tool-discovery-bot@aikesif.com';
// Prefer stable aliases; older 1.5/2.0 flash ids may return 404 for new API keys.
const GEMINI_MODELS = [
  process.env.GEMINI_TEXT_MODEL,
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
].filter(Boolean);
const ALLOWED_PRICING_MODELS = new Set([
  'Ücretsiz',
  'Freemium',
  'Abonelik',
  'Tek Seferlik Ödeme',
  'Bilinmiyor',
]);
const ALLOWED_PLATFORMS = new Set([
  'Web',
  'iOS',
  'Android',
  'Windows',
  'macOS',
  'Linux',
  'Chrome Uzantısı',
]);
const ALLOWED_TIERS = new Set(['Normal', 'Pro', 'Sponsorlu']);

const REJECTED_HOSTS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'localhost',
  '127.0.0.1',
]);

function clampInteger(value, { fallback, min, max }) {
  const parsed = Number.parseInt(String(value || ''), 10);
  const base = Number.isInteger(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, base));
}

function resolveBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function normalizePricingModel(value, description, link) {
  const normalized = normalizeTextField(value || '');
  if (ALLOWED_PRICING_MODELS.has(normalized)) return normalized;
  return inferPricingModel(description, link) || 'Bilinmiyor';
}

function normalizePlatforms(value, link) {
  const platforms = Array.isArray(value)
    ? value.map((item) => normalizeTextField(item)).filter(Boolean)
    : [];
  const accepted = platforms.filter((platform) => ALLOWED_PLATFORMS.has(platform));

  if (accepted.length > 0) {
    return [...new Set(accepted)].slice(0, 5);
  }

  return inferPlatformsFromLink(link) || ['Web'];
}

function normalizeTier(value) {
  const normalized = normalizeTextField(value || '');
  return ALLOWED_TIERS.has(normalized) ? normalized : 'Normal';
}

function normalizeList(value, maxItems = 5) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeTextField(item))
    .filter(Boolean)
    .slice(0, maxItems);
}

function buildTechnicalDetails(candidate) {
  const sections = [];
  const featureBullets = normalizeList(candidate.features, 5);
  const useCaseBullets = normalizeList(candidate.use_cases, 5);
  const audienceBullets = normalizeList(candidate.target_users, 4);
  const limitations = normalizeList(candidate.limitations, 3);
  const sourceReason = normalizeTextField(candidate.source_reason || '');

  if (featureBullets.length > 0) {
    sections.push(`Öne çıkan özellikler:\n${featureBullets.map((item) => `- ${item}`).join('\n')}`);
  }

  if (useCaseBullets.length > 0) {
    sections.push(`Kullanım alanları:\n${useCaseBullets.map((item) => `- ${item}`).join('\n')}`);
  }

  if (audienceBullets.length > 0) {
    sections.push(`Kimler için uygun:\n${audienceBullets.map((item) => `- ${item}`).join('\n')}`);
  }

  if (limitations.length > 0) {
    sections.push(
      `Dikkat edilmesi gerekenler:\n${limitations.map((item) => `- ${item}`).join('\n')}`
    );
  }

  if (sourceReason) {
    sections.push(`Keşif notu:\n${sourceReason}`);
  }

  return sections.join('\n\n').slice(0, 1600) || null;
}

function getDetailReadiness(candidate) {
  const features = normalizeList(candidate.features, 5);
  const useCases = normalizeList(candidate.use_cases, 5);
  const targetUsers = normalizeList(candidate.target_users, 4);
  const limitations = normalizeList(candidate.limitations, 3);
  const sectionCount = [features, useCases, targetUsers, limitations].filter(
    (items) => items.length > 0
  ).length;

  return {
    features,
    useCases,
    targetUsers,
    limitations,
    sectionCount,
    isReady: features.length >= 2 && useCases.length >= 2 && targetUsers.length >= 1,
  };
}

function isRejectedHost(link) {
  try {
    const hostname = new URL(link).hostname.toLowerCase().replace(/^www\./, '');
    return (
      REJECTED_HOSTS.has(hostname) ||
      hostname.endsWith('.example') ||
      hostname.endsWith('.invalid') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.test')
    );
  } catch {
    return true;
  }
}

function buildUniqueSlug(name, existingSlugs) {
  const baseSlug = slugify(name).slice(0, 80) || `ai-tool-${Date.now()}`;
  let candidate = baseSlug;
  let index = 2;

  while (existingSlugs.has(candidate)) {
    candidate = `${baseSlug}-${index}`;
    index += 1;
  }

  existingSlugs.add(candidate);
  return candidate;
}

function normalizeCandidate(rawCandidate, categoriesByName) {
  const name = normalizeTextField(rawCandidate?.name || '');
  const description = normalizeTextField(rawCandidate?.description || '');
  const normalizedLink = normalizeToolUrl(rawCandidate?.link || '');
  const requestedCategory = normalizeTextField(rawCandidate?.category || '').toLocaleLowerCase(
    'tr-TR'
  );

  if (name.length < 2 || name.length > 80) {
    return { error: 'Araç adı geçersiz.' };
  }

  if (description.length < 60 || description.length > 600) {
    return { error: 'Açıklama 60-600 karakter arasında olmalı.' };
  }

  if (!normalizedLink || isRejectedHost(normalizedLink)) {
    return { error: 'Geçersiz veya test bağlantısı.' };
  }

  if (getBlockedToolHost(normalizedLink)) {
    return { error: 'Dizin/aggregator bağlantısı reddedildi.' };
  }

  const category =
    categoriesByName.get(requestedCategory) ||
    categoriesByName.get('yapay zeka') ||
    categoriesByName.get('genel') ||
    categoriesByName.values().next().value;

  if (!category) {
    return { error: 'Kategori bulunamadı.' };
  }

  const platforms = normalizePlatforms(rawCandidate?.platforms, normalizedLink);
  const pricingModel = normalizePricingModel(
    rawCandidate?.pricing_model,
    description,
    normalizedLink
  );
  const tier = normalizeTier(rawCandidate?.tier);
  const detailReadiness = getDetailReadiness(rawCandidate);

  if (!detailReadiness.isReady) {
    return {
      error:
        'Kart/detay sayfası için yeterli metadata yok. En az 2 özellik, 2 kullanım alanı ve 1 hedef kullanıcı gerekli.',
    };
  }

  const technicalDetails = buildTechnicalDetails(rawCandidate);

  return {
    value: {
      name,
      description,
      link: normalizedLink,
      category,
      pricing_model: pricingModel,
      platforms,
      tier,
      technical_details: technicalDetails,
      detail_readiness: {
        section_count: detailReadiness.sectionCount,
        feature_count: detailReadiness.features.length,
        use_case_count: detailReadiness.useCases.length,
        target_user_count: detailReadiness.targetUsers.length,
        limitation_count: detailReadiness.limitations.length,
      },
      source_reason: normalizeTextField(rawCandidate?.source_reason || '').slice(0, 300),
    },
  };
}

async function fetchWithTimeout(url, method, timeoutMs) {
  return fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'user-agent': 'AI Kesif Tool Discovery/1.0',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'cache-control': 'no-cache',
    },
  });
}

function classifyLinkCheck(response) {
  if (response.ok) {
    return {
      status: 'valid',
      httpStatus: response.status,
      error: null,
    };
  }

  if ([401, 403, 408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
    return {
      status: 'review',
      httpStatus: response.status,
      error: `Sunucu ${response.status} döndürdü.`,
    };
  }

  return {
    status: 'invalid',
    httpStatus: response.status,
    error: `Sunucu ${response.status} döndürdü.`,
  };
}

async function closeResponse(response) {
  try {
    await response.body?.cancel();
  } catch {}
}

async function checkCandidateLink(link, timeoutMs) {
  try {
    const headResponse = await fetchWithTimeout(link, 'HEAD', timeoutMs);
    const headResult = classifyLinkCheck(headResponse);
    await closeResponse(headResponse);
    if (headResult.status === 'valid' || headResult.status === 'invalid') {
      return headResult;
    }
  } catch (error) {
    const code = error?.cause?.code || error?.code || error?.name;
    if (code === 'ENOTFOUND') {
      return { status: 'invalid', httpStatus: null, error: 'DNS hatası.' };
    }
  }

  try {
    const getResponse = await fetchWithTimeout(link, 'GET', timeoutMs);
    const getResult = classifyLinkCheck(getResponse);
    await closeResponse(getResponse);
    return getResult;
  } catch (error) {
    const code = error?.cause?.code || error?.code || error?.name;
    if (code === 'ENOTFOUND') {
      return { status: 'invalid', httpStatus: null, error: 'DNS hatası.' };
    }
    return {
      status: 'review',
      httpStatus: null,
      error: code ? `${code}: fetch failed` : 'Bağlantı otomatik doğrulanamadı.',
    };
  }
}

async function buildEmbeddingValue({ name, description }) {
  try {
    const values = await embedGeminiText(`${name}. ${description}`);
    return `[${values.join(',')}]`;
  } catch (error) {
    console.error('Tool discovery embedding üretilemedi:', error?.message || error);
    return null;
  }
}

function buildDiscoveryPrompt({ categories, existingTools, candidateCount }) {
  const categoryNames = categories.map((category) => category.name).join(', ');
  const existingNames = existingTools
    .slice(0, 450)
    .map((tool) => `- ${tool.name}`)
    .join('\n');

  return `
Sen AI Keşif Platformu için ürün araştırmacısısın.

Görev:
- Gerçek, kullanılabilir, resmî web sitesi olan yapay zeka araçlarını öner.
- Dizin/aggregator siteleri, blog yazıları, sahte/example linkler ve tekrarları önerme.
- Link mutlaka aracın resmî ana sayfası veya resmî ürün sayfası olmalı.
- Açıklamalar Türkçe, net ve kullanıcı faydasına odaklı olmalı.
- Araç kartı ve detay sayfası için fiyat türü, platform, seviye ve teknik detayları hazır doldur.
- Bilmediğin fiyat bilgisini uydurma; emin değilsen "Bilinmiyor" yaz.
- Mevcut araç listesindeki ürünleri tekrar önerme.

Platform kategorileri:
${categoryNames}

Mevcut araçlar:
${existingNames}

${candidateCount} aday üret. Sadece JSON döndür:
{
  "tools": [
    {
      "name": "Araç adı",
      "description": "Türkçe, 80-220 karakter arası açıklama",
      "link": "https://official-site.example",
      "category": "Platform kategorilerinden en uygunu",
      "pricing_model": "Ücretsiz | Freemium | Abonelik | Tek Seferlik Ödeme | Bilinmiyor",
      "platforms": ["Web | iOS | Android | Windows | macOS | Linux | Chrome Uzantısı"],
      "tier": "Normal",
      "features": ["Kart ve detay sayfasında gösterilecek 3-5 temel özellik"],
      "use_cases": ["Aracın uygun olduğu 3-5 kullanım senaryosu"],
      "target_users": ["Kimler için uygun olduğuna dair 2-4 kısa madde"],
      "limitations": ["Varsa dikkat edilmesi gereken 1-3 nokta"],
      "source_reason": "Bu aracın neden eklendiğine dair kısa editör notu"
    }
  ]
}
`.trim();
}

async function generateCandidatesWithGemini({ categories, existingTools, candidateCount }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ortam değişkeni eksik.');
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: buildDiscoveryPrompt({ categories, existingTools, candidateCount }),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      responseMimeType: 'application/json',
    },
  };

  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      lastError = `${modelName}: ${response.status} ${await response.text()}`;
      continue;
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      lastError = `${modelName}: boş cevap`;
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      lastError = `${modelName}: geçersiz JSON döndürdü (${parseError.message})`;
      continue;
    }
    return Array.isArray(parsed.tools) ? parsed.tools : [];
  }

  throw new Error(lastError || 'Gemini araç adayları üretemedi.');
}

async function notifyAdmin({ insertedTools, skippedCount }) {
  if (insertedTools.length === 0) return;

  const autoApprovedCount = insertedTools.filter((tool) => tool.is_approved).length;
  const pendingCount = insertedTools.length - autoApprovedCount;
  const description =
    `${insertedTools.length} yeni araç keşfedildi. ` +
    `${pendingCount} aday onay kuyruğuna eklendi, ${autoApprovedCount} aday otomatik yayına alındı.` +
    (skippedCount > 0 ? ` ${skippedCount} aday duplicate/kalite kontrolünden elendi.` : '');

  try {
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.from('admin_alerts').insert({
      alert_type: 'tool_discovery',
      description,
      status: 'Açık',
      link: ADMIN_NOTIFICATION_LINK,
      metadata: {
        tool_ids: insertedTools.map((tool) => tool.id).filter(Boolean),
        tool_names: insertedTools.map((tool) => tool.name),
        auto_approved_tool_ids: insertedTools
          .filter((tool) => tool.is_approved)
          .map((tool) => tool.id)
          .filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Tool discovery admin alert oluşturulamadı:', error);
  }

  if (
    !process.env.RESEND_API_KEY ||
    !process.env.ADMIN_NOTIF_EMAIL_FROM ||
    !process.env.ADMIN_NOTIF_EMAIL_TO
  ) {
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: process.env.ADMIN_NOTIF_EMAIL_TO,
      subject: 'AI Keşif - Yeni araç adayları bulundu',
      html: `
        <h1>Yeni araç adayları</h1>
        <p>${description}</p>
        <ul>
          ${insertedTools
            .map((tool) => `<li><strong>${tool.name}</strong> — ${tool.link}</li>`)
            .join('')}
        </ul>
        <p>Onay kuyruğu: <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/admin">Admin paneli</a></p>
      `,
    });
  } catch (error) {
    console.error('Tool discovery e-postası gönderilemedi:', error);
  }
}

export async function runScheduledToolDiscovery(options = {}) {
  const dryRun = Boolean(options.dryRun);
  const autoApprove = resolveBoolean(
    options.autoApprove ?? process.env.TOOL_DISCOVERY_AUTO_APPROVE,
    false
  );
  const limit = clampInteger(options.limit || process.env.TOOL_DISCOVERY_LIMIT, {
    fallback: DEFAULT_LIMIT,
    min: 1,
    max: MAX_LIMIT,
  });
  const candidateCount = clampInteger(
    options.candidateCount || process.env.TOOL_DISCOVERY_CANDIDATE_COUNT,
    {
      fallback: DEFAULT_CANDIDATE_COUNT,
      min: limit,
      max: MAX_CANDIDATE_COUNT,
    }
  );
  const timeoutMs = clampInteger(options.timeoutMs || process.env.TOOL_DISCOVERY_TIMEOUT_MS, {
    fallback: DEFAULT_TIMEOUT_MS,
    min: 3000,
    max: 12000,
  });

  const supabaseAdmin = createAdminClient();
  const [{ data: categories, error: categoriesError }, { data: existingTools, error: toolsError }] =
    await Promise.all([
      supabaseAdmin.from('categories').select('id, name, slug').order('name'),
      supabaseAdmin
        .from('tools')
        .select('id, name, slug, link')
        .order('created_at', { ascending: false }),
    ]);

  if (categoriesError) throw new Error(`Kategoriler okunamadı: ${categoriesError.message}`);
  if (toolsError) throw new Error(`Mevcut araçlar okunamadı: ${toolsError.message}`);
  if (!categories?.length) throw new Error('Kategori bulunamadı.');

  const categoriesByName = new Map(
    categories.map((category) => [
      String(category.name || '')
        .trim()
        .toLocaleLowerCase('tr-TR'),
      category,
    ])
  );
  const existingNames = new Set(
    (existingTools || []).map((tool) =>
      String(tool.name || '')
        .trim()
        .toLocaleLowerCase('tr-TR')
    )
  );
  const existingLinks = new Set((existingTools || []).map((tool) => normalizeToolLink(tool.link)));
  const existingSlugs = new Set((existingTools || []).map((tool) => tool.slug).filter(Boolean));

  const rawCandidates = await generateCandidatesWithGemini({
    categories,
    existingTools: existingTools || [],
    candidateCount,
  });

  const accepted = [];
  const skipped = [];

  for (const rawCandidate of rawCandidates) {
    if (accepted.length >= limit) break;

    const normalized = normalizeCandidate(rawCandidate, categoriesByName);
    if (normalized.error) {
      skipped.push({ name: rawCandidate?.name || 'Bilinmeyen', reason: normalized.error });
      continue;
    }

    const candidate = normalized.value;
    const nameKey = candidate.name.toLocaleLowerCase('tr-TR');
    const linkKey = normalizeToolLink(candidate.link);

    if (existingNames.has(nameKey) || existingLinks.has(linkKey)) {
      skipped.push({ name: candidate.name, reason: 'Mevcut araçla eşleşiyor.' });
      continue;
    }

    const linkCheck = await checkCandidateLink(candidate.link, timeoutMs);
    if (linkCheck.status === 'invalid') {
      skipped.push({ name: candidate.name, reason: linkCheck.error || 'Link doğrulanamadı.' });
      continue;
    }

    const slug = buildUniqueSlug(candidate.name, existingSlugs);
    existingNames.add(nameKey);
    existingLinks.add(linkKey);
    const shouldAutoApprove = autoApprove && linkCheck.status === 'valid';
    const embedding = await buildEmbeddingValue({
      name: candidate.name,
      description: candidate.description,
    });

    const acceptedCandidate = {
      name: candidate.name,
      slug,
      description: candidate.description,
      link: candidate.link,
      category_id: candidate.category.id,
      pricing_model: candidate.pricing_model,
      platforms: candidate.platforms,
      tier: candidate.tier,
      is_approved: shouldAutoApprove,
      suggester_email: DISCOVERY_BOT_EMAIL,
      technical_details: candidate.technical_details,
      __detail_readiness: candidate.detail_readiness,
      link_check_status: linkCheck.status,
      link_check_error: linkCheck.error,
      link_check_http_status: linkCheck.httpStatus,
      link_checked_at: new Date().toISOString(),
    };

    if (embedding) {
      acceptedCandidate.embedding = embedding;
    }

    accepted.push(acceptedCandidate);
  }

  let insertedTools = [];
  if (!dryRun && accepted.length > 0) {
    const insertPayload = accepted.map(({ __detail_readiness, ...tool }) => tool);
    const { data, error } = await supabaseAdmin
      .from('tools')
      .insert(insertPayload)
      .select('id, name, slug, link, is_approved');

    if (error) {
      throw new Error(`Araç adayları eklenemedi: ${error.message}`);
    }
    insertedTools = data || [];
  }

  if (!dryRun) {
    await notifyAdmin({ insertedTools, skippedCount: skipped.length });
  }

  return {
    dryRun,
    autoApprove,
    generatedCount: rawCandidates.length,
    acceptedCount: accepted.length,
    insertedCount: insertedTools.length,
    autoApprovedCount: accepted.filter((tool) => tool.is_approved).length,
    skippedCount: skipped.length,
    insertedTools,
    acceptedCandidates: dryRun
      ? accepted.map(
          ({
            name,
            slug,
            link,
            category_id,
            pricing_model,
            platforms,
            tier,
            technical_details,
            __detail_readiness,
            link_check_status,
            is_approved,
          }) => ({
            name,
            slug,
            link,
            category_id,
            pricing_model,
            platforms,
            tier,
            technical_details,
            detail_readiness: __detail_readiness,
            link_check_status,
            is_approved,
          })
        )
      : [],
    skipped: skipped.slice(0, 20),
  };
}
