/**
 * Queue a scraped tool as is_approved=false for admin review.
 * Used by Kâşif “add this tool” intent — not a public publish path.
 */

import 'server-only';

import { createAdminClient } from '@/utils/supabase/admin';
import { slugify } from '@/utils/slugify';
import logger from '@/utils/logger';
import { scrapeToolPage } from '@/lib/toolScrape';
import { buildCatalogDedupeIndex, extractHostKey, findCatalogDuplicates } from '@/lib/toolScrape';

/**
 * @param {string} rawUrl
 * @param {{ suggesterNote?: string, locale?: string }} [options]
 * @returns {Promise<{
 *   ok: boolean,
 *   status?: string,
 *   error?: string,
 *   candidate?: object,
 *   inserted?: object,
 *   duplicates?: object,
 *   warnings?: string[],
 * }>}
 */
export async function queueToolCandidateFromUrl(rawUrl, options = {}) {
  const url = String(rawUrl || '').trim();
  if (!url) {
    return { ok: false, error: 'URL gerekli.' };
  }

  const scrape = await scrapeToolPage(url, { provider: 'auto' });
  if (!scrape.ok) {
    return {
      ok: false,
      error: scrape.error || 'Scrape başarısız.',
      warnings: scrape.warnings || [],
    };
  }

  const candidate = scrape.candidate;
  const admin = createAdminClient();

  const { data: existingByName } = await admin
    .from('tools')
    .select('id, name, slug, link, is_approved')
    .ilike('name', candidate.name)
    .limit(5);

  const { data: existingByLink } = await admin
    .from('tools')
    .select('id, name, slug, link, is_approved')
    .eq('link', candidate.link)
    .limit(5);

  let existingByHost = [];
  const hostKey = extractHostKey(candidate.link);
  if (hostKey) {
    const { data: hostRows } = await admin
      .from('tools')
      .select('id, name, slug, link, is_approved')
      .ilike('link', `%${hostKey}%`)
      .limit(20);
    existingByHost = (hostRows || []).filter((row) => extractHostKey(row.link) === hostKey);
  }

  const catalogIndex = buildCatalogDedupeIndex([
    ...(existingByName || []),
    ...(existingByLink || []),
    ...existingByHost,
  ]);
  const hostNameDup = findCatalogDuplicates(candidate, catalogIndex);
  const isDuplicate =
    hostNameDup.isDuplicate ||
    (existingByName || []).length > 0 ||
    (existingByLink || []).length > 0 ||
    existingByHost.length > 0;

  if (isDuplicate) {
    return {
      ok: true,
      status: 'duplicate',
      candidate,
      duplicates: {
        byName: existingByName || [],
        byLink: existingByLink || [],
        byHost: existingByHost,
        reasons: hostNameDup.reasons,
      },
      warnings: scrape.warnings || [],
    };
  }

  const { data: categories } = await admin
    .from('categories')
    .select('id, name, slug')
    .order('name')
    .limit(50);
  const category =
    (categories || []).find((item) => /yapay zeka|genel|ai/i.test(String(item.name || ''))) ||
    (categories || [])[0] ||
    null;

  if (!category) {
    return { ok: false, error: 'Kategori bulunamadı; aday kaydedilemedi.', candidate };
  }

  const baseSlug = slugify(candidate.name) || `tool-${Date.now()}`;
  let slug = baseSlug;
  const { data: slugClash } = await admin.from('tools').select('id').eq('slug', slug).maybeSingle();
  if (slugClash) slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

  const note = String(options.suggesterNote || '')
    .trim()
    .slice(0, 400);
  const insertPayload = {
    name: candidate.name,
    slug,
    description: candidate.description,
    link: candidate.link,
    category_id: category.id,
    pricing_model: candidate.pricing_model || 'Freemium',
    platforms: candidate.platforms || ['Web'],
    tier: candidate.tier || 'Normal',
    is_approved: false,
    suggester_email: 'kasif-add-tool@aikesif.com',
    technical_details: [
      '## Özellikler',
      ...(candidate.features || []).map((item) => `- ${item}`),
      '',
      '## Kullanım alanları',
      ...(candidate.use_cases || []).map((item) => `- ${item}`),
      '',
      `> Kaynak: Kâşif sohbet aday kuyruğu${note ? ` — ${note}` : ''}`,
      `> Scrape: ${candidate.source_reason || 'URL scrape'}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };

  try {
    const { getEmbedding } = await import('@/app/actions/ai');
    const textToEmbed = `${candidate.name}. ${candidate.description}.`;
    const embedding = await getEmbedding(textToEmbed);
    insertPayload.embedding = `[${embedding.join(',')}]`;
  } catch (embedError) {
    logger.warn('Kâşif add-tool embedding skipped:', embedError?.message || embedError);
  }

  const { data: inserted, error: insertError } = await admin
    .from('tools')
    .insert(insertPayload)
    .select('id, name, slug, link, is_approved')
    .single();

  if (insertError) {
    logger.error('Kâşif add-tool insert failed:', insertError);
    return { ok: false, error: 'Aday kaydedilemedi.', candidate };
  }

  // Ops: always inbox alert; optional email when KASIF_ADD_TOOL_NOTIFY=true
  logger.info('Kâşif add-tool queued', {
    name: inserted?.name || candidate.name,
    slug: inserted?.slug,
    link: inserted?.link || candidate.link,
    toolId: inserted?.id,
  });
  void notifyAdminAddToolQueued({
    name: inserted?.name || candidate.name,
    slug: inserted?.slug,
    link: inserted?.link || candidate.link,
    toolId: inserted?.id,
    note,
  });

  return {
    ok: true,
    status: 'queued',
    candidate,
    inserted,
    warnings: scrape.warnings || [],
  };
}

/**
 * Always create admin_alerts row; optional Resend email.
 * @param {{ name?: string, slug?: string, link?: string, toolId?: string|number, note?: string }} payload
 */
export async function notifyAdminAddToolQueued(payload = {}) {
  const name = String(payload.name || 'tool').slice(0, 120);
  const slug = String(payload.slug || '').slice(0, 120);
  const link = String(payload.link || '').slice(0, 500);
  const toolId = payload.toolId || null;
  const note = String(payload.note || '').slice(0, 400);
  const description = `Kâşif sohbet adayı: ${name}${slug ? ` (${slug})` : ''}${
    link ? ` — ${link}` : ''
  }`;
  const adminLink = '/admin?tab=approval_queue';
  const metadata = {
    source: 'kasif_add_tool',
    tool_id: toolId,
    tool_name: name,
    tool_slug: slug || null,
    tool_link: link || null,
    note: note || null,
  };

  try {
    const admin = createAdminClient();
    const { error: alertError } = await admin.from('admin_alerts').insert({
      alert_type: 'kasif_add_tool',
      description,
      status: 'Açık',
      link: adminLink,
      metadata,
    });
    if (alertError) {
      logger.warn('Kâşif add-tool admin_alerts insert failed:', alertError.message || alertError);
    }
  } catch (error) {
    logger.warn('Kâşif add-tool admin_alerts error:', error?.message || error);
  }

  if (String(process.env.KASIF_ADD_TOOL_NOTIFY || '').toLowerCase() !== 'true') return;
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim();
  const resendKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!adminEmail || !resendKey) return;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    const from =
      String(process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || '').trim() ||
      'aikeşif <onboarding@resend.dev>';
    await resend.emails.send({
      from,
      to: adminEmail,
      subject: `[Kâşif] Yeni araç adayı: ${name}`,
      text: [
        'Kâşif sohbetinden yeni katalog adayı kuyruğa alındı (is_approved=false).',
        '',
        `İsim: ${name || '—'}`,
        `Slug: ${slug || '—'}`,
        `Link: ${link || '—'}`,
        note ? `Not: ${note}` : null,
        '',
        'Admin: /admin?tab=approval_queue veya Uyarılar (kasif_add_tool).',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  } catch (error) {
    logger.warn('Kâşif add-tool notify failed:', error?.message || error);
  }
}
